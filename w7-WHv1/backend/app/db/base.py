"""SQLAlchemy declarative base and common mixins."""

import uuid as uuid_module
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, String, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class GUID(TypeDecorator):
    """
    Platform-independent GUID type.

    Uses PostgreSQL's UUID type when available, otherwise stores as String(36).
    """

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        """Load the appropriate implementation based on dialect."""
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        """Process the value before binding to the database."""
        if value is None:
            return value
        if dialect.name == "postgresql":
            return value
        if isinstance(value, uuid_module.UUID):
            return str(value)
        return value

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        """Process the value after loading from the database."""
        if value is None:
            return value
        if isinstance(value, uuid_module.UUID):
            return value
        return uuid_module.UUID(value)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class TimestampMixin:
    """Mixin for created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class UUIDMixin:
    """Mixin for UUID primary key."""

    id: Mapped[uuid_module.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid_module.uuid4,
    )
