import asyncio
import json
import os
from pathlib import Path
from contextlib import asynccontextmanager

import faiss
import httpx
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.config import settings
from core.seed import seed_admin_user
from routers.auth import router as auth_router
from routers.admin.users import router as admin_users_router
from routers.admin.documents import router as admin_documents_router
from routers.chat import router as chat_router

# Run migrations synchronously before app starts
async def run_migrations():
    def sync_migrations():
        from alembic.config import Config
        from alembic import command
        import psycopg2
        import os
        
        # Use sync connection for migrations
        db_url = os.environ.get('SYNC_DATABASE_URL') or os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
        
        # Connect and run migrations in sync context
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        
        # Use subprocess to run alembic with proper env
        import subprocess
        result = subprocess.run(
            ['alembic', 'upgrade', 'head'],
            capture_output=True,
            text=True,
            cwd='/app'
        )
        
        if result.returncode != 0:
            print(f"Migration stderr: {result.stderr}", file=sys.stderr)
            if "already exists" not in result.stderr:
                raise RuntimeError(f"Migration failed: {result.stderr}")
        
        conn.close()
        print("Migrations completed")
    
    # Run sync migrations in threadpool
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, sync_migrations)

async def seed_admin():
    async with AsyncSessionLocal() as db:
        await seed_admin_user(db)

def load_faiss_index(app_state):
    index_path = Path(settings.FAISS_INDEX_PATH)
    index_path.mkdir(parents=True, exist_ok=True)
    
    index_file = index_path / "index.faiss"
    metadata_file = index_path / "metadata.json"
    
    if index_file.exists() and metadata_file.exists():
        try:
            faiss_index = faiss.read_index(str(index_file))
            with open(metadata_file, "r") as f:
                metadata_list = json.load(f)
            print(f"Loaded FAISS index with {faiss_index.ntotal} vectors")
        except Exception as e:
            print(f"Error loading FAISS index: {e}")
            faiss_index = faiss.IndexFlatIP(768)
            metadata_list = []
    else:
        print("Creating new FAISS index")
        faiss_index = faiss.IndexFlatIP(768)
        metadata_list = []
    
    app_state.faiss_index = faiss_index
    app_state.faiss_metadata = metadata_list

def save_faiss_index(app_state):
    index_path = Path(settings.FAISS_INDEX_PATH)
    index_path.mkdir(parents=True, exist_ok=True)
    
    try:
        faiss.write_index(app_state.faiss_index, str(index_path / "index.faiss"))
        with open(index_path / "metadata.json", "w") as f:
            json.dump(app_state.faiss_metadata, f)
        print(f"Saved FAISS index with {app_state.faiss_index.ntotal} vectors")
    except Exception as e:
        print(f"Error saving FAISS index: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await run_migrations()
    await seed_admin()
    load_faiss_index(app.state)
    app.state.http_client = httpx.AsyncClient(timeout=120.0)
    
    yield
    
    # Shutdown
    save_faiss_index(app.state)
    await app.state.http_client.aclose()

app = FastAPI(
    title="Internal AI Chatbot API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://frontend-user:80",
        "http://frontend-admin:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth_router, prefix="/api")
app.include_router(admin_users_router, prefix="/api")
app.include_router(admin_documents_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

@app.get("/api/health")
async def health():
    ollama_reachable = False
    db_connected = False
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.OLLAMA_HOST}/api/tags")
            ollama_reachable = response.status_code == 200
    except:
        pass
    
    try:
        async with AsyncSessionLocal() as db:
            await db.execute("SELECT 1")
            db_connected = True
    except:
        pass
    
    return {
        "status": "ok",
        "ollama_reachable": ollama_reachable,
        "db_connected": db_connected
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
