"""Jobs API endpoints for scheduled task monitoring and manual triggers."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.deps import DbSession, RequireAdmin, RequireManager
from app.core.i18n import HU_JOB_MESSAGES
from app.db.models.job_execution import JobExecution
from app.schemas.jobs import (
    JobExecutionListResponse,
    JobExecutionResponse,
    JobStatusResponse,
    JobTriggerRequest,
    JobTriggerResponse,
)
from app.tasks import celery_app
from app.tasks.jobs import (
    check_expiry_warnings_task,
    cleanup_expired_reservations_task,
    send_expiry_alerts_task,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


def calculate_pages(total: int, page_size: int) -> int:
    """Calculate total pages."""
    return (total + page_size - 1) // page_size if page_size > 0 else 0


# Map job names to Celery tasks
JOB_TASKS = {
    "cleanup_expired_reservations": cleanup_expired_reservations_task,
    "check_expiry_warnings": check_expiry_warnings_task,
    "send_expiry_alerts": send_expiry_alerts_task,
}


@router.post("/trigger", response_model=JobTriggerResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_job(
    trigger_request: JobTriggerRequest,
    db: DbSession,
    current_user: RequireAdmin,
) -> JobTriggerResponse:
    """
    Manually trigger a scheduled job (admin only).

    Available jobs:
    - cleanup_expired_reservations: Release expired reservation holds
    - check_expiry_warnings: Check for expiring products
    - send_expiry_alerts: Send email alerts for critical expiry items
    """
    job_name = trigger_request.job_name

    if job_name not in JOB_TASKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=HU_JOB_MESSAGES["job_not_found"],
        )

    # Trigger the task asynchronously
    task = JOB_TASKS[job_name]
    result = task.delay()

    return JobTriggerResponse(
        job_name=job_name,
        task_id=result.id,
        message=HU_JOB_MESSAGES["job_trigger_success"],
    )


@router.get("/status/{task_id}", response_model=JobStatusResponse)
async def get_job_status(
    task_id: str,
    db: DbSession,
    current_user: RequireManager,
) -> JobStatusResponse:
    """
    Check the status of a triggered job by task ID (manager+ only).
    """
    result = celery_app.AsyncResult(task_id)

    error = None
    task_result = None

    if result.failed():
        error = str(result.result) if result.result else "Unknown error"
    elif result.successful():
        task_result = (
            result.result if isinstance(result.result, dict) else {"result": result.result}
        )

    return JobStatusResponse(
        task_id=task_id,
        status=result.status,
        result=task_result,
        error=error,
    )


@router.get("/executions", response_model=JobExecutionListResponse)
async def list_job_executions(
    db: DbSession,
    current_user: RequireManager,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    job_name: str | None = None,
    job_status: str | None = Query(None, alias="status"),
) -> JobExecutionListResponse:
    """
    List job execution history (manager+ only).
    """
    query = select(JobExecution)

    if job_name:
        query = query.where(JobExecution.job_name == job_name)
    if job_status:
        query = query.where(JobExecution.status == job_status)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated results
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(JobExecution.started_at.desc()).offset(offset).limit(page_size)
    )
    executions = list(result.scalars().all())

    items = [
        JobExecutionResponse(
            id=job.id,
            job_name=job.job_name,
            status=job.status,
            started_at=job.started_at,
            finished_at=job.finished_at,
            result=job.result,
            error_message=job.error_message,
        )
        for job in executions
    ]

    return JobExecutionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=calculate_pages(total, page_size),
    )


@router.get("/executions/{execution_id}", response_model=JobExecutionResponse)
async def get_job_execution(
    execution_id: UUID,
    db: DbSession,
    current_user: RequireManager,
) -> JobExecutionResponse:
    """
    Get job execution details by ID (manager+ only).
    """
    result = await db.execute(select(JobExecution).where(JobExecution.id == execution_id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_JOB_MESSAGES["job_not_found"],
        )

    return JobExecutionResponse(
        id=job.id,
        job_name=job.job_name,
        status=job.status,
        started_at=job.started_at,
        finished_at=job.finished_at,
        result=job.result,
        error_message=job.error_message,
    )
