from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    filetype: str
    chunk_count: int
    status: str
    uploaded_at: datetime
    uploaded_by_name: str

    class Config:
        from_attributes = True

class DocumentStatusResponse(BaseModel):
    id: UUID
    status: str
    chunk_count: int

class DocumentUploadResponse(BaseModel):
    document_id: UUID
    filename: str
    status: str
