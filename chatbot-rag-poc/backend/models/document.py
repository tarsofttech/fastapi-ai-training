from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum as SQLEnum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from core.database import Base

class DocumentStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    filename = Column(String(255), nullable=False)
    filetype = Column(String(10), nullable=False)  # pdf, txt, docx
    chunk_count = Column(Integer, default=0)
    file_size_bytes = Column(Integer)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="processing")

    uploaded_by_user = relationship("User", back_populates="documents")
