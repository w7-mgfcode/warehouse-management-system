"""Pytest fixtures for WMS backend tests."""

import os
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.bin_movement import BinMovement
from app.db.models.product import Product
from app.db.models.supplier import Supplier
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


@pytest.fixture(scope="session", autouse=True)
async def _dispose_test_engine() -> AsyncGenerator[None]:
    yield
    await test_engine.dispose()


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


@pytest.fixture
async def sample_product(db_session: AsyncSession) -> Product:
    """Create a sample product for testing."""
    product = Product(
        id=uuid.uuid4(),
        name="Test Product",
        sku="TEST-001",
        category="Test Category",
        default_unit="db",
        description="Test description",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(product)
    await db_session.flush()
    await db_session.refresh(product)
    return product


@pytest.fixture
async def sample_supplier(db_session: AsyncSession) -> Supplier:
    """Create a sample supplier for testing."""
    supplier = Supplier(
        id=uuid.uuid4(),
        company_name="Test Supplier Kft.",
        contact_person="Test Contact",
        email="test@supplier.hu",
        phone="+36 30 123 4567",
        address="Budapest, Test utca 1.",
        tax_number="12345678-2-42",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(supplier)
    await db_session.flush()
    await db_session.refresh(supplier)
    return supplier


@pytest.fixture
async def sample_bin(db_session: AsyncSession, sample_warehouse: Warehouse) -> Bin:
    """Create a sample bin for testing."""
    bin_obj = Bin(
        id=uuid.uuid4(),
        warehouse_id=sample_warehouse.id,
        code="A-01",
        structure_data={"aisle": "A", "level": "01"},
        status="empty",
        max_weight=1000.0,
        max_height=180.0,
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_obj)
    await db_session.flush()
    await db_session.refresh(bin_obj)
    return bin_obj


@pytest.fixture
async def second_bin(db_session: AsyncSession, sample_warehouse: Warehouse) -> Bin:
    """Create a second bin for testing transfers."""
    bin_obj = Bin(
        id=uuid.uuid4(),
        warehouse_id=sample_warehouse.id,
        code="A-02",
        structure_data={"aisle": "A", "level": "02"},
        status="empty",
        max_weight=1000.0,
        max_height=180.0,
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_obj)
    await db_session.flush()
    await db_session.refresh(bin_obj)
    return bin_obj


@pytest.fixture
async def inactive_bin(db_session: AsyncSession, sample_warehouse: Warehouse) -> Bin:
    """Create an inactive bin for testing."""
    bin_obj = Bin(
        id=uuid.uuid4(),
        warehouse_id=sample_warehouse.id,
        code="A-03",
        structure_data={"aisle": "A", "level": "03"},
        status="empty",
        max_weight=1000.0,
        max_height=180.0,
        is_active=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_obj)
    await db_session.flush()
    await db_session.refresh(bin_obj)
    return bin_obj


@pytest.fixture
async def sample_bin_content(
    db_session: AsyncSession,
    sample_bin: Bin,
    sample_product: Product,
    sample_supplier: Supplier,
) -> BinContent:
    """Create sample bin content for inventory tests."""
    bin_content = BinContent(
        id=uuid.uuid4(),
        bin_id=sample_bin.id,
        product_id=sample_product.id,
        supplier_id=sample_supplier.id,
        batch_number="BATCH-TEST-001",
        use_by_date=date.today() + timedelta(days=30),
        quantity=Decimal("100.0"),
        unit="kg",
        status="available",
        received_date=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_content)
    # Update bin status to occupied
    sample_bin.status = "occupied"
    await db_session.flush()
    await db_session.refresh(bin_content)
    return bin_content


@pytest.fixture
async def sample_bin_content_expired(
    db_session: AsyncSession,
    second_bin: Bin,
    sample_product: Product,
    sample_supplier: Supplier,
) -> BinContent:
    """Create expired bin content for testing."""
    bin_content = BinContent(
        id=uuid.uuid4(),
        bin_id=second_bin.id,
        product_id=sample_product.id,
        supplier_id=sample_supplier.id,
        batch_number="BATCH-EXPIRED-001",
        use_by_date=date.today() - timedelta(days=5),
        quantity=Decimal("50.0"),
        unit="kg",
        status="available",
        received_date=datetime.now(UTC) - timedelta(days=60),
        created_at=datetime.now(UTC) - timedelta(days=60),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_content)
    # Update bin status to occupied
    second_bin.status = "occupied"
    await db_session.flush()
    await db_session.refresh(bin_content)
    return bin_content


@pytest.fixture
async def sample_bin_content_critical_expiry(
    db_session: AsyncSession,
    sample_warehouse: Warehouse,
    sample_product: Product,
    sample_supplier: Supplier,
) -> BinContent:
    """Create bin content with critical expiry (< 7 days) for testing."""
    # Create a new bin for this content
    bin_obj = Bin(
        id=uuid.uuid4(),
        warehouse_id=sample_warehouse.id,
        code="B-01",
        structure_data={"aisle": "B", "level": "01"},
        status="occupied",
        max_weight=1000.0,
        max_height=180.0,
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_obj)
    await db_session.flush()

    bin_content = BinContent(
        id=uuid.uuid4(),
        bin_id=bin_obj.id,
        product_id=sample_product.id,
        supplier_id=sample_supplier.id,
        batch_number="BATCH-CRITICAL-001",
        use_by_date=date.today() + timedelta(days=3),
        quantity=Decimal("25.0"),
        unit="kg",
        status="available",
        received_date=datetime.now(UTC) - timedelta(days=30),
        created_at=datetime.now(UTC) - timedelta(days=30),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_content)
    await db_session.flush()
    await db_session.refresh(bin_content)
    return bin_content


@pytest.fixture
async def sample_movement(
    db_session: AsyncSession,
    sample_bin_content: BinContent,
    warehouse_user: User,
) -> BinMovement:
    """Create sample movement for testing."""
    movement = BinMovement(
        id=uuid.uuid4(),
        bin_content_id=sample_bin_content.id,
        movement_type="receipt",
        quantity=Decimal("100.0"),
        quantity_before=Decimal("0.0"),
        quantity_after=Decimal("100.0"),
        reason="supplier_delivery",
        reference_number="REF-TEST-001",
        fefo_compliant=True,
        force_override=False,
        notes="Test receipt",
        created_by=warehouse_user.id,
        created_at=datetime.now(UTC),
    )
    db_session.add(movement)
    await db_session.flush()
    await db_session.refresh(movement)
    return movement
