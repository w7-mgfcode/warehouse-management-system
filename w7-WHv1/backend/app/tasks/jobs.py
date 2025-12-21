"""Celery background tasks for scheduled jobs."""

import asyncio
import logging
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.job_execution import JobExecution
from app.db.session import async_session_maker
from app.services.expiry import get_expired_products, get_expiry_warnings
from app.services.reservation import cleanup_expired_reservations
from app.tasks import celery_app

logger = logging.getLogger(__name__)


async def _log_job_execution(
    db: AsyncSession,
    job_name: str,
    status: str,
    result: dict | None = None,
    error_message: str | None = None,
) -> JobExecution:
    """Log a job execution to the database."""
    job = JobExecution(
        job_name=job_name,
        status=status,
        result=result,
        error_message=error_message,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def _update_job_execution(
    db: AsyncSession,
    job: JobExecution,
    status: str,
    result: dict | None = None,
    error_message: str | None = None,
) -> None:
    """Update an existing job execution record."""
    job.status = status
    job.finished_at = datetime.now(UTC)
    if result:
        job.result = result
    if error_message:
        job.error_message = error_message
    await db.commit()


@celery_app.task(name="app.tasks.jobs.cleanup_expired_reservations_task")
def cleanup_expired_reservations_task() -> dict:
    """
    Cleanup expired reservations by releasing reserved quantities.

    Runs hourly via Celery beat.

    Returns:
        dict: Task result with count of expired reservations.
    """
    return asyncio.run(_cleanup_expired_reservations_async())


async def _cleanup_expired_reservations_async() -> dict:
    """Async implementation of cleanup expired reservations."""
    start_time = datetime.now(UTC)

    async with async_session_maker() as db:
        # Log job start
        job = await _log_job_execution(
            db=db,
            job_name="cleanup_expired_reservations",
            status="running",
        )

        try:
            # Run the cleanup
            expired_count = await cleanup_expired_reservations(db)

            duration = (datetime.now(UTC) - start_time).total_seconds()
            result = {
                "expired_reservations_count": expired_count,
                "message": f"{expired_count} db lejárt foglalás feloldva",
            }

            # Update job with success
            await _update_job_execution(
                db=db,
                job=job,
                status="completed",
                result=result,
                duration_seconds=duration,
            )

            logger.info(f"Cleanup expired reservations: {expired_count} released")
            return result

        except Exception as e:
            duration = (datetime.now(UTC) - start_time).total_seconds()
            await _update_job_execution(
                db=db,
                job=job,
                status="failed",
                error_message=str(e),
                duration_seconds=duration,
            )
            logger.error(f"Cleanup expired reservations failed: {e}")
            raise


@celery_app.task(name="app.tasks.jobs.check_expiry_warnings_task")
def check_expiry_warnings_task() -> dict:
    """
    Check for products approaching expiration.

    Runs daily via Celery beat.

    Returns:
        dict: Task result with warning counts.
    """
    return asyncio.run(_check_expiry_warnings_async())


async def _check_expiry_warnings_async() -> dict:
    """Async implementation of check expiry warnings."""
    start_time = datetime.now(UTC)

    async with async_session_maker() as db:
        # Log job start
        job = await _log_job_execution(
            db=db,
            job_name="check_expiry_warnings",
            status="running",
        )

        try:
            # Get expiry warnings
            warnings_response = await get_expiry_warnings(
                db=db,
                days_threshold=settings.EXPIRY_WARNING_DAYS,
            )

            # Get expired products
            expired_response = await get_expired_products(db=db)

            duration = (datetime.now(UTC) - start_time).total_seconds()
            result = {
                "warning_counts": {
                    "critical": warnings_response.summary.critical,
                    "high": warnings_response.summary.high,
                    "medium": warnings_response.summary.medium,
                    "low": warnings_response.summary.low,
                    "total": warnings_response.summary.total,
                },
                "expired_count": expired_response.total,
                "message": (
                    f"Figyelmeztetések: {warnings_response.summary.total}, "
                    f"Lejárt: {expired_response.total}"
                ),
            }

            # Update job with success
            await _update_job_execution(
                db=db,
                job=job,
                status="completed",
                result=result,
                duration_seconds=duration,
            )

            logger.info(
                f"Expiry check: {warnings_response.summary.total} warnings, "
                f"{expired_response.total} expired"
            )
            return result

        except Exception as e:
            duration = (datetime.now(UTC) - start_time).total_seconds()
            await _update_job_execution(
                db=db,
                job=job,
                status="failed",
                error_message=str(e),
                duration_seconds=duration,
            )
            logger.error(f"Check expiry warnings failed: {e}")
            raise


@celery_app.task(name="app.tasks.jobs.send_expiry_alerts_task")
def send_expiry_alerts_task() -> dict:
    """
    Send email alerts for critical expiry warnings.

    Runs daily via Celery beat.

    Returns:
        dict: Task result with alert sending status.
    """
    return asyncio.run(_send_expiry_alerts_async())


async def _send_expiry_alerts_async() -> dict:
    """Async implementation of send expiry alerts."""
    start_time = datetime.now(UTC)

    async with async_session_maker() as db:
        # Log job start
        job = await _log_job_execution(
            db=db,
            job_name="send_expiry_alerts",
            status="running",
        )

        try:
            # Check if email is enabled
            if not settings.EMAIL_ENABLED:
                result = {
                    "emails_sent": 0,
                    "message": "Email küldés le van tiltva",
                    "skipped": True,
                }
                duration = (datetime.now(UTC) - start_time).total_seconds()
                await _update_job_execution(
                    db=db,
                    job=job,
                    status="completed",
                    result=result,
                    duration_seconds=duration,
                )
                return result

            # Get critical and high warnings
            warnings_response = await get_expiry_warnings(
                db=db,
                days_threshold=settings.EXPIRY_CRITICAL_DAYS,
            )

            # Check if there are critical items
            if warnings_response.summary.critical == 0 and warnings_response.summary.high == 0:
                result = {
                    "emails_sent": 0,
                    "message": "Nincs kritikus lejárat figyelmeztetés",
                    "critical_count": 0,
                    "high_count": 0,
                }
                duration = (datetime.now(UTC) - start_time).total_seconds()
                await _update_job_execution(
                    db=db,
                    job=job,
                    status="completed",
                    result=result,
                    duration_seconds=duration,
                )
                return result

            # Import email service and send alerts
            from app.services.email import send_expiry_alert_email

            recipients = [
                email.strip()
                for email in settings.ALERT_RECIPIENT_EMAILS.split(",")
                if email.strip()
            ]

            emails_sent = 0
            if recipients:
                await send_expiry_alert_email(
                    recipients=recipients,
                    warnings=warnings_response.items,
                    summary=warnings_response.summary,
                )
                emails_sent = len(recipients)

            duration = (datetime.now(UTC) - start_time).total_seconds()
            result = {
                "emails_sent": emails_sent,
                "message": f"{emails_sent} email elküldve",
                "critical_count": warnings_response.summary.critical,
                "high_count": warnings_response.summary.high,
            }

            await _update_job_execution(
                db=db,
                job=job,
                status="completed",
                result=result,
                duration_seconds=duration,
            )

            logger.info(f"Expiry alerts: {emails_sent} emails sent")
            return result

        except Exception as e:
            duration = (datetime.now(UTC) - start_time).total_seconds()
            await _update_job_execution(
                db=db,
                job=job,
                status="failed",
                error_message=str(e),
                duration_seconds=duration,
            )
            logger.error(f"Send expiry alerts failed: {e}")
            raise
