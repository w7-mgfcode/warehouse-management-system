"""Celery application configuration for scheduled background tasks."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "wms_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.jobs"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.TIMEZONE,
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "cleanup-expired-reservations": {
        "task": "app.tasks.jobs.cleanup_expired_reservations_task",
        "schedule": 3600.0,  # Every hour
    },
    "check-expiry-warnings": {
        "task": "app.tasks.jobs.check_expiry_warnings_task",
        "schedule": 86400.0,  # Daily
    },
    "send-expiry-alerts": {
        "task": "app.tasks.jobs.send_expiry_alerts_task",
        "schedule": 86400.0,  # Daily
    },
}
