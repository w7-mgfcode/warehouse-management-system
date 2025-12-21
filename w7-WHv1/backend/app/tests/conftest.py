"""Pytest fixtures for WMS backend tests."""

import os
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.db.session import get_async_session
from app.main import app

# Default: fast in-memory SQLite. In CI, set TEST_DATABASE_URL to Postgres.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

if TEST_DATABASE_URL.startswith("sqlite"):
    test_engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
else:
    test_engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession]:
    """
    Create a test database session.

    Creates tables before each test and drops them after.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient]:
    """
    Create a test HTTP client with dependency override.
    """

    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_async_session] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user for testing."""
    user = User(
        id=uuid.uuid4(),
        username="testadmin",
        email="testadmin@test.com",
        password_hash=get_password_hash("TestPass123!"),
        full_name="Test Admin",
        role="admin",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def manager_user(db_session: AsyncSession) -> User:
    """Create a manager user for testing."""
    user = User(
        id=uuid.uuid4(),
        username="testmanager",
        email="testmanager@test.com",
        password_hash=get_password_hash("TestPass123!"),
        full_name="Test Manager",
        role="manager",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def warehouse_user(db_session: AsyncSession) -> User:
    """Create a warehouse user for testing."""
    user = User(
        id=uuid.uuid4(),
        username="testwarehouse",
        email="testwarehouse@test.com",
        password_hash=get_password_hash("TestPass123!"),
        full_name="Test Warehouse",
        role="warehouse",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def viewer_user(db_session: AsyncSession) -> User:
    """Create a viewer user for testing."""
    user = User(
        id=uuid.uuid4(),
        username="testviewer",
        email="testviewer@test.com",
        password_hash=get_password_hash("TestPass123!"),
        full_name="Test Viewer",
        role="viewer",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def inactive_user(db_session: AsyncSession) -> User:
    """Create an inactive user for testing."""
    user = User(
        id=uuid.uuid4(),
        username="inactiveuser",
        email="inactive@test.com",
        password_hash=get_password_hash("TestPass123!"),
        full_name="Inactive User",
        role="warehouse",
        is_active=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Create an access token for admin user."""
    return create_access_token(str(admin_user.id))


@pytest.fixture
def manager_token(manager_user: User) -> str:
    """Create an access token for manager user."""
    return create_access_token(str(manager_user.id))


@pytest.fixture
def warehouse_token(warehouse_user: User) -> str:
    """Create an access token for warehouse user."""
    return create_access_token(str(warehouse_user.id))


@pytest.fixture
def viewer_token(viewer_user: User) -> str:
    """Create an access token for viewer user."""
    return create_access_token(str(viewer_user.id))


@pytest.fixture
async def sample_warehouse(db_session: AsyncSession) -> Warehouse:
    """Create a sample warehouse for testing."""
    warehouse = Warehouse(
        id=uuid.uuid4(),
        name="Test Warehouse",
        location="Test Location",
        description="Test Description",
        bin_structure_template={
            "fields": [
                {"name": "aisle", "label": "Sor", "required": True, "order": 1},
                {"name": "level", "label": "Szint", "required": True, "order": 2},
            ],
            "code_format": "{aisle}-{level}",
            "separator": "-",
            "auto_uppercase": True,
            "zero_padding": True,
        },
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(warehouse)
    await db_session.flush()
    await db_session.refresh(warehouse)
    return warehouse


def auth_header(token: str) -> dict[str, str]:
    """Create authorization header with token."""
    return {"Authorization": f"Bearer {token}"}
