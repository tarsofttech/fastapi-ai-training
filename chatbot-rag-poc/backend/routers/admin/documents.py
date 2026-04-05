from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
import os
import shutil
from pathlib import Path

from core.database import get_db
from core.dependencies import require_admin, get_faiss_engine
from core.config import settings
from models.document import Document
from models.user import User
from schemas.document import DocumentResponse, DocumentStatusResponse, DocumentUploadResponse
from services.ingest import IngestService

router = APIRouter(prefix="/admin/documents", tags=["admin-documents"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    result = await db.execute(
        select(Document, User.name.label("uploader_name"))
        .outerjoin(User, Document.uploaded_by == User.id)
        .order_by(Document.uploaded_at.desc())
    )
    
    docs = []
    for doc, uploader_name in result.all():
        doc_data = {
            "id": doc.id,
            "filename": doc.filename,
            "filetype": doc.filetype,
            "chunk_count": doc.chunk_count,
            "status": doc.status.value if hasattr(doc.status, "value") else doc.status,
            "uploaded_at": doc.uploaded_at,
            "uploaded_by_name": uploader_name or "Unknown"
        }
        docs.append(doc_data)
    return docs

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
    app_state = Depends(get_faiss_engine)
):
    ext = file.filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    doc_id = UUID(os.urandom(16).hex()[:32], version=4)
    
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / f"{doc_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_size = os.path.getsize(file_path)
    
    new_doc = Document(
        id=doc_id,
        filename=file.filename,
        filetype=ext,
        file_size_bytes=file_size,
        uploaded_by=admin.id,
        status="processing"
    )
    db.add(new_doc)
    await db.commit()
    
    ingest_service = IngestService(app_state)
    
    async def process_ingestion():
        async with AsyncSessionLocal() as session:
            try:
                await ingest_service.ingest_document(
                    str(file_path),
                    file.filename,
                    ext,
                    doc_id,
                    session
                )
            except Exception as e:
                print(f"Ingestion failed: {e}")
    
    from core.database import AsyncSessionLocal
    background_tasks.add_task(process_ingestion)
    
    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        status="processing"
    )

@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
    app_state = Depends(get_faiss_engine)
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    ingest_service = IngestService(app_state)
    ingest_service.delete_document_vectors(document_id)
    
    file_path = Path(settings.UPLOAD_DIR) / f"{document_id}_{doc.filename}"
    if file_path.exists():
        os.remove(file_path)
    
    await db.delete(doc)
    await db.commit()
    
    return {"message": "deleted"}

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status.value if hasattr(doc.status, "value") else doc.status,
        chunk_count=doc.chunk_count
    )
