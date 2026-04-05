import asyncio
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config, AsyncEngine, create_async_engine

from alembic import context

import sys
sys.path.append(".")

from core.database import Base
from models.user import User
from models.document import Document
from models.session import ChatSession, ChatMessage

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

import os

async def run_async_migrations():
    # Get async DATABASE_URL from environment
    database_url = os.environ.get('DATABASE_URL')
    
    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_offline() -> None:
    import os
    url = os.environ.get('SYNC_DATABASE_URL') or os.environ.get('DATABASE_URL', '').replace('+asyncpg', '')
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    try:
        # Check if there's already an event loop running
        loop = asyncio.get_running_loop()
        # If we're in an async context, schedule the coroutine
        import nest_asyncio
        nest_asyncio.apply()
        asyncio.run(run_async_migrations())
    except RuntimeError:
        # No event loop running, safe to use asyncio.run
        asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
