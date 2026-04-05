import os
import json
import faiss
import numpy as np
import httpx
from typing import List, Dict, Optional
from uuid import UUID
from pathlib import Path

from sqlalchemy import select
from llama_index.core.node_parser import SentenceSplitter
from pypdf import PdfReader
from docx import Document

from core.config import settings

class IngestService:
    def __init__(self, app_state):
        self.app_state = app_state
        self.splitter = SentenceSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )

    async def extract_text(self, file_path: str, filetype: str) -> str:
        if filetype == "pdf":
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        elif filetype == "docx":
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text
        elif filetype == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        else:
            raise ValueError(f"Unsupported file type: {filetype}")

    async def chunk_text(self, text: str) -> List[str]:
        nodes = self.splitter.split_text(text)
        return [str(node) for node in nodes]

    async def embed_text(self, text: str) -> List[float]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_HOST}/api/embeddings",
                json={"model": settings.EMBED_MODEL, "prompt": text}
            )
            response.raise_for_status()
            data = response.json()
            return data["embedding"]

    async def ingest_document(
        self,
        file_path: str,
        filename: str,
        filetype: str,
        document_id: UUID,
        db
    ) -> int:
        try:
            text = await self.extract_text(file_path, filetype)
            chunks = await self.chunk_text(text)
            
            faiss_index = self.app_state.faiss_index
            metadata_list = self.app_state.faiss_metadata
            http_client = self.app_state.http_client
            
            for i, chunk in enumerate(chunks):
                response = await http_client.post(
                    f"{settings.OLLAMA_HOST}/api/embeddings",
                    json={"model": settings.EMBED_MODEL, "prompt": chunk},
                    timeout=60.0
                )
                response.raise_for_status()
                embedding = response.json()["embedding"]
                
                vector = np.array(embedding, dtype=np.float32).reshape(1, -1)
                faiss.normalize_L2(vector)
                
                faiss_index.add(vector)
                metadata_list.append({
                    "document_id": str(document_id),
                    "filename": filename,
                    "chunk_index": i,
                    "content": chunk
                })
            
            self._save_faiss_index(faiss_index, metadata_list)
            
            from models.document import Document
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one()
            doc.status = "ready"
            doc.chunk_count = len(chunks)
            await db.commit()
            
            return len(chunks)
        except Exception as e:
            from models.document import Document
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            doc = result.scalar_one()
            doc.status = "failed"
            await db.commit()
            raise e

    def _save_faiss_index(self, faiss_index, metadata_list):
        index_path = Path(settings.FAISS_INDEX_PATH)
        index_path.mkdir(parents=True, exist_ok=True)
        
        faiss.write_index(faiss_index, str(index_path / "index.faiss"))
        with open(index_path / "metadata.json", "w") as f:
            json.dump(metadata_list, f)

    def delete_document_vectors(self, document_id: UUID):
        metadata_list = self.app_state.faiss_metadata
        faiss_index = self.app_state.faiss_index
        
        new_metadata = [
            m for m in metadata_list 
            if m["document_id"] != str(document_id)
        ]
        
        if len(new_metadata) == len(metadata_list):
            return
        
        if len(new_metadata) == 0:
            new_index = faiss.IndexFlatIP(768)
        else:
            new_index = faiss.IndexFlatIP(768)
            for meta in new_metadata:
                response = httpx.post(
                    f"{settings.OLLAMA_HOST}/api/embeddings",
                    json={"model": settings.EMBED_MODEL, "prompt": meta["content"]},
                    timeout=60.0
                )
                response.raise_for_status()
                embedding = response.json()["embedding"]
                vector = np.array(embedding, dtype=np.float32).reshape(1, -1)
                faiss.normalize_L2(vector)
                new_index.add(vector)
        
        self.app_state.faiss_index = new_index
        self.app_state.faiss_metadata = new_metadata
        self._save_faiss_index(new_index, new_metadata)

from models.document import Document
