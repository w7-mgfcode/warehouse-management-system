"""Seed script to create initial data (admin user and sample warehouse)."""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.db.session import async_session_maker


async def create_admin_user(db: AsyncSession) -> User | None:
    """
    Create admin user if not exists.

    Args:
        db: Async database session.

    Returns:
        User | None: Created user or None if already exists.
    """
    result = await db.execute(select(User).where(User.username == "admin"))
    existing = result.scalar_one_or_none()

    if existing:
        print("Admin user already exists, skipping...")
        return None

    admin = User(
        username="admin",
        email="admin@wms.local",
        password_hash=get_password_hash("Admin123!"),
        full_name="System Administrator",
        role="admin",
        is_active=True,
    )
    db.add(admin)
    await db.flush()
    await db.refresh(admin)
    print(f"Created admin user: {admin.username}")
    return admin


async def create_sample_warehouse(db: AsyncSession) -> Warehouse | None:
    """
    Create sample warehouse if not exists.

    Args:
        db: Async database session.

    Returns:
        Warehouse | None: Created warehouse or None if already exists.
    """
    result = await db.execute(select(Warehouse).where(Warehouse.name == "Foraktar"))
    existing = result.scalar_one_or_none()

    if existing:
        print("Sample warehouse already exists, skipping...")
        return None

    warehouse = Warehouse(
        name="Foraktar",
        location="Budapest, Logisztikai Park",
        description="Fo elosztokozpont raklaphelyes tarolassal",
        bin_structure_template={
            "fields": [
                {"name": "aisle", "label": "Sor", "required": True, "order": 1},
                {"name": "rack", "label": "Allvany", "required": True, "order": 2},
                {"name": "level", "label": "Szint", "required": True, "order": 3},
                {"name": "position", "label": "Pozicio", "required": True, "order": 4},
            ],
            "code_format": "{aisle}-{rack}-{level}-{position}",
            "separator": "-",
            "auto_uppercase": True,
            "zero_padding": True,
        },
        is_active=True,
    )
    db.add(warehouse)
    await db.flush()
    await db.refresh(warehouse)
    print(f"Created sample warehouse: {warehouse.name}")
    return warehouse


async def seed_database() -> None:
    """Run all seed operations."""
    print("Starting database seed...")

    async with async_session_maker() as db:
        try:
            await create_admin_user(db)
            await create_sample_warehouse(db)
            await db.commit()
            print("Database seed completed successfully!")
        except Exception as e:
            await db.rollback()
            print(f"Error during seed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
