"""Job execution model for tracking scheduled tasks."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import GUID, Base


class JobExecution(Base):
    """
    Execution log for scheduled jobs.

    Tracks all Celery task executions including:
    - Start and finish times
    - Status (running, success, failed)
    - Result data (JSON)
    - Error messages for failed jobs
    """

    __tablename__ = "job_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    job_name: Mapped[str] = mapped_column(String(100), nullable=False)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="running",
        nullable=False,
    )  # running, success, failed
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Result stored as JSON - uses TEXT for SQLite compatibility
    result: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(Text, "sqlite"),
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    items_processed: Mapped[int | None] = mapped_column(nullable=True)
    items_affected: Mapped[int | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index("ix_job_executions_job_name", "job_name"),
        Index("ix_job_executions_status", "status"),
        Index("ix_job_executions_started_at", "started_at"),
    )
