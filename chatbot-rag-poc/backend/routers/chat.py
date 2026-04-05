from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
import json
from pydantic import BaseModel

def uuid_serializer(obj):
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

from core.database import get_db
from core.dependencies import get_current_user, get_faiss_engine
from models.user import User
from models.session import ChatSession, ChatMessage
from schemas.chat import (
    ChatRequest, ChatSessionResponse, ChatSessionDetailResponse,
    ChatMessageResponse, ChatStreamToken, ChatStreamSources, ChatStreamDone
)
from services.chat_session import get_or_create_session, get_history, save_message, update_session_title
from services.rag import RAGService

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("")
async def chat_stream(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    app_state = Depends(get_faiss_engine)
):
    session = await get_or_create_session(request.session_id, current_user.id, db)
    
    history = await get_history(session.id, db, limit=6)
    
    rag_service = RAGService(app_state)
    
    retrieved_chunks = await rag_service.search(request.message, 3)
    
    messages = await rag_service.build_augmented_prompt(request.message, retrieved_chunks, history)
    
    sources_info = [
        {
            "filename": chunk["filename"],
            "score": chunk["score"],
            "chunk_index": chunk["chunk_index"]
        }
        for chunk in retrieved_chunks
    ]
    
    async def event_generator():
        full_response = ""
        
        async for token in rag_service.stream_response(messages):
            full_response += token
            data = ChatStreamToken(content=token)
            yield f"data: {json.dumps(data.model_dump(), default=uuid_serializer)}\n\n"
        
        sources_data = ChatStreamSources(sources=sources_info)
        yield f"data: {json.dumps(sources_data.model_dump(), default=uuid_serializer)}\n\n"
        
        await save_message(session.id, "user", request.message, None, db)
        await save_message(session.id, "assistant", full_response, sources_info, db)
        
        if len(history) == 0:
            await update_session_title(session.id, request.message, db)
        
        done_data = ChatStreamDone(session_id=session.id)
        yield f"data: {json.dumps(done_data.model_dump(), default=uuid_serializer)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(
            ChatSession,
            func.count(ChatMessage.id).label("message_count")
        )
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.user_id == current_user.id)
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
    )
    
    sessions = []
    for session, msg_count in result.all():
        sessions.append({
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": msg_count
        })
    return sessions

@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    session_data = {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "message_count": len(messages)
    }
    
    messages_data = []
    for msg in messages:
        messages_data.append({
            "id": msg.id,
            "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
            "content": msg.content,
            "sources": msg.sources,
            "created_at": msg.created_at
        })
    
    return {
        "session": session_data,
        "messages": messages_data
    }

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()
    
    return {"message": "deleted"}
