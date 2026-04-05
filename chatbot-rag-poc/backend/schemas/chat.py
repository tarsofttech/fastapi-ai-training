from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class SourceInfo(BaseModel):
    filename: str
    score: float
    chunk_index: int

class ChatMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    sources: Optional[List[SourceInfo]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int

    class Config:
        from_attributes = True

class ChatSessionDetailResponse(BaseModel):
    session: ChatSessionResponse
    messages: List[ChatMessageResponse]

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[UUID] = None

class ChatStreamToken(BaseModel):
    type: str = "token"
    content: str

class ChatStreamSources(BaseModel):
    type: str = "sources"
    sources: List[SourceInfo]

class ChatStreamDone(BaseModel):
    type: str = "done"
    session_id: UUID

    class Config:
        json_encoders = {UUID: str}
