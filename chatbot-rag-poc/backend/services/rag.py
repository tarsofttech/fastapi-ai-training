import json
import httpx
import numpy as np
import faiss
from typing import List, Dict, AsyncGenerator, Optional
from uuid import UUID

from core.config import settings

class RAGService:
    SYSTEM_PROMPT = """You are a helpful internal company assistant.
Answer questions using ONLY the context provided below.
If the answer is not in the context, say:
"I don't have that information in the company knowledge base."
Always be concise. Cite the source document name for each claim."""

    def __init__(self, app_state):
        self.app_state = app_state
        self.http_client = app_state.http_client

    async def search(self, query: str, top_k: int) -> List[Dict]:
        response = await self.http_client.post(
            f"{settings.OLLAMA_HOST}/api/embeddings",
            json={"model": settings.EMBED_MODEL, "prompt": query},
            timeout=60.0
        )
        response.raise_for_status()
        embedding = response.json()["embedding"]
        
        query_vector = np.array(embedding, dtype=np.float32).reshape(1, -1)
        faiss.normalize_L2(query_vector)
        
        faiss_index = self.app_state.faiss_index
        metadata_list = self.app_state.faiss_metadata
        
        if faiss_index.ntotal == 0:
            return []
        
        scores, indices = faiss_index.search(query_vector, min(top_k, faiss_index.ntotal))
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(metadata_list):
                meta = metadata_list[idx]
                results.append({
                    "content": meta["content"],
                    "filename": meta["filename"],
                    "chunk_index": meta["chunk_index"],
                    "score": float(score)
                })
        
        return results

    async def build_augmented_prompt(
        self,
        question: str,
        retrieved_chunks: List[Dict],
        history: List
    ) -> List[Dict]:
        context = "\n\n".join([
            f"[Source: {chunk['filename']}]\n{chunk['content']}"
            for chunk in retrieved_chunks
        ])
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "system", "content": f"CONTEXT:\n{context}"}
        ]
        
        for msg in history:
            messages.append({
                "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                "content": msg.content
            })
        
        messages.append({"role": "user", "content": question})
        
        return messages

    async def stream_response(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        try:
            async with self.http_client.stream(
                "POST",
                f"{settings.OLLAMA_HOST}/api/chat",
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "stream": True
                },
                timeout=120.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            if data.get("done"):
                                break
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError as e:
            print(f"ERROR: Cannot connect to Ollama at {settings.OLLAMA_HOST}: {e}")
            yield "Error: Cannot connect to AI service. Please ensure Ollama is running."
        except httpx.TimeoutException as e:
            print(f"ERROR: Timeout connecting to Ollama: {e}")
            yield "Error: AI service timeout. Please try again."
        except Exception as e:
            print(f"ERROR: Unexpected error in stream_response: {e}")
            yield f"Error: {str(e)}"

    async def query(
        self,
        question: str,
        session_id: UUID,
        db
    ):
        from services.chat_session import get_history, save_message, update_session_title
        
        history = await get_history(session_id, db, limit=6)
        
        retrieved_chunks = await self.search(question, settings.TOP_K)
        
        messages = await self.build_augmented_prompt(question, retrieved_chunks, history)
        
        full_response = ""
        async for token in self.stream_response(messages):
            full_response += token
        
        sources = [
            {
                "filename": chunk["filename"],
                "score": chunk["score"],
                "chunk_index": chunk["chunk_index"]
            }
            for chunk in retrieved_chunks
        ]
        
        await save_message(session_id, "user", question, None, db)
        await save_message(session_id, "assistant", full_response, sources, db)
        
        if len(history) == 0:
            await update_session_title(session_id, question, db)
        
        return full_response, sources
