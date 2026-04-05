from sqlalchemy import select
from typing import Optional
from uuid import UUID
from datetime import datetime

from models.session import ChatSession, ChatMessage
from models.user import User

async def get_or_create_session(
    session_id: Optional[UUID],
    user_id: UUID,
    db
) -> ChatSession:
    if session_id:
        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )
        session = result.scalar_one_or_none()
        if session:
            return session
    
    new_session = ChatSession(
        user_id=user_id,
        title="New Chat"
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

async def get_history(
    session_id: UUID,
    db,
    limit: int = 6
) -> list:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return list(reversed(messages))

async def save_message(
    session_id: UUID,
    role: str,
    content: str,
    sources: Optional[list],
    db
) -> ChatMessage:
    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        sources=sources
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message

async def update_session_title(
    session_id: UUID,
    title: str,
    db
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session and session.title == "New Chat":
        session.title = title[:60]
        await db.commit()
