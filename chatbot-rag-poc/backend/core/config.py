from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    SYNC_DATABASE_URL: str
    OLLAMA_HOST: str = "http://host.docker.internal:11434"
    EMBED_MODEL: str = "nomic-embed-text"
    LLM_MODEL: str = "llama3.2:1b"
    JWT_SECRET: str
    JWT_EXPIRE_MINUTES: int = 15
    REFRESH_EXPIRE_DAYS: int = 7
    ADMIN_SEED_EMAIL: str
    ADMIN_SEED_PASSWORD: str
    FAISS_INDEX_PATH: str = "/app/data/faiss_index"
    UPLOAD_DIR: str = "/app/data/uploads"
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
