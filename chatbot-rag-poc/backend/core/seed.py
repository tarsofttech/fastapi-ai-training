from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User
from core.security import hash_password
from core.config import settings

async def seed_admin_user(db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.role == "admin"))
    existing_admin = result.scalar_one_or_none()
    
    if existing_admin:
        return
    
    admin_user = User(
        name="Admin",
        email=settings.ADMIN_SEED_EMAIL,
        hashed_password=hash_password(settings.ADMIN_SEED_PASSWORD),
        role="admin",
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()
    print(f"Seeded admin user: {settings.ADMIN_SEED_EMAIL}")
