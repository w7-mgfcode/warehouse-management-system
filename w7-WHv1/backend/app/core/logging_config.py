"""
Structured JSON logging configuration for production.

Uses python-json-logger to output JSON logs that can be easily
ingested by log aggregation systems (ELK, Loki, etc.).
"""

import logging
import sys
from pythonjsonlogger import jsonlogger
from datetime import timezone, datetime
from typing import Optional


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter with additional context fields.

    Adds:
    - timestamp in ISO 8601 format with UTC timezone
    - application name and version
    - hostname and process ID
    - log level as string
    """

    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict) -> None:
        """
        Add custom fields to log record.

        Args:
            log_record (dict): Log record dictionary
            record (logging.LogRecord): Original log record
            message_dict (dict): Message dictionary
        """
        super().add_fields(log_record, record, message_dict)

        # Add timestamp in ISO 8601 format with UTC timezone
        log_record["timestamp"] = datetime.now(timezone.utc).isoformat()

        # Add application context
        log_record["app"] = "wms"
        log_record["version"] = "1.0.0"
        log_record["phase"] = "6"

        # Add log level as string (not just numeric levelno)
        log_record["level"] = record.levelname

        # Add logger name
        log_record["logger"] = record.name

        # Add process and thread info for debugging
        log_record["process"] = record.process
        log_record["thread"] = record.thread

        # Add module and function context
        log_record["module"] = record.module
        log_record["function"] = record.funcName
        log_record["line"] = record.lineno

        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)


def setup_logging(
    log_level: str = "INFO",
    log_format: str = "json",
    enable_file_logging: bool = False,
    log_file_path: Optional[str] = None,
) -> None:
    """
    Configure application logging.

    Args:
        log_level (str): Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format (str): Log format ("json" or "text")
        enable_file_logging (bool): Enable logging to file
        log_file_path (str, optional): Path to log file
    """
    # Convert string log level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Remove existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers = []

    # Set root logger level
    root_logger.setLevel(numeric_level)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)

    if log_format == "json":
        # JSON formatter for production
        json_formatter = CustomJsonFormatter(
            fmt="%(timestamp)s %(level)s %(name)s %(message)s",
            rename_fields={
                "levelname": "level",
                "name": "logger",
                "threadName": "thread_name",
                "processName": "process_name",
            },
        )
        console_handler.setFormatter(json_formatter)
    else:
        # Text formatter for development
        text_formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler.setFormatter(text_formatter)

    root_logger.addHandler(console_handler)

    # Add file handler if enabled
    if enable_file_logging and log_file_path:
        file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
        file_handler.setLevel(numeric_level)

        if log_format == "json":
            file_handler.setFormatter(json_formatter)
        else:
            file_handler.setFormatter(text_formatter)

        root_logger.addHandler(file_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.WARNING)

    # Log initial configuration
    root_logger.info(
        "Logging configured",
        extra={
            "log_level": log_level,
            "log_format": log_format,
            "file_logging": enable_file_logging,
        },
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name (str): Logger name (usually __name__)

    Returns:
        logging.Logger: Configured logger
    """
    return logging.getLogger(name)


# Context manager for adding request context to logs
class LogContext:
    """
    Context manager for adding request-specific context to logs.

    Usage:
        with LogContext(request_id="abc123", user_id="user-456"):
            logger.info("Processing request")
    """

    def __init__(self, **kwargs) -> None:
        """
        Initialize log context.

        Args:
            **kwargs: Context key-value pairs to add to logs
        """
        self.context = kwargs
        self.old_factory = None

    def __enter__(self):
        """
        Enter context and add fields to log records.

        Returns:
            LogContext: Self
        """
        self.old_factory = logging.getLogRecordFactory()

        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record

        logging.setLogRecordFactory(record_factory)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Exit context and restore original record factory.

        Args:
            exc_type: Exception type
            exc_val: Exception value
            exc_tb: Exception traceback
        """
        logging.setLogRecordFactory(self.old_factory)


# Middleware helper for logging HTTP requests
def log_request(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None,
) -> None:
    """
    Log HTTP request with structured data.

    Args:
        method (str): HTTP method
        path (str): Request path
        status_code (int): HTTP status code
        duration_ms (float): Request duration in milliseconds
        user_id (str, optional): User ID if authenticated
        request_id (str, optional): Request ID for tracing
    """
    logger = get_logger("wms.http")

    log_data = {
        "http_method": method,
        "http_path": path,
        "http_status": status_code,
        "duration_ms": duration_ms,
    }

    if user_id:
        log_data["user_id"] = user_id

    if request_id:
        log_data["request_id"] = request_id

    # Log at different levels based on status code
    if status_code >= 500:
        logger.error("HTTP request failed", extra=log_data)
    elif status_code >= 400:
        logger.warning("HTTP request error", extra=log_data)
    else:
        logger.info("HTTP request completed", extra=log_data)
