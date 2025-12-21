"""Job schemas for scheduled task monitoring and manual triggers."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

JobName = Literal[
    "cleanup_expired_reservations",
    "check_expiry_warnings",
    "send_expiry_alerts",
]


class JobTriggerRequest(BaseModel):
    """Request schema for manually triggering a job."""

    job_name: JobName

    model_config = ConfigDict(str_strip_whitespace=True)


class JobTriggerResponse(BaseModel):
    """Response schema for job trigger."""

    job_name: str
    task_id: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class JobExecutionResponse(BaseModel):
    """Response schema for job execution record."""

    id: UUID
    job_name: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    result: dict[str, Any] | None
    error_message: str | None

    model_config = ConfigDict(from_attributes=True)


class JobExecutionListResponse(BaseModel):
    """Paginated job execution list response."""

    items: list[JobExecutionResponse]
    total: int
    page: int
    page_size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)


class JobStatusResponse(BaseModel):
    """Response schema for checking job status by task ID."""

    task_id: str
    status: str
    result: dict[str, Any] | None
    error: str | None

    model_config = ConfigDict(from_attributes=True)
