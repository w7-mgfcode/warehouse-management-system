"""
Tests for structured logging configuration.
"""

import json
import logging
from io import StringIO

from app.core.logging_config import (
    CustomJsonFormatter,
    get_logger,
    get_request_logger,
    log_request,
    setup_logging,
)


class TestLoggingSetup:
    """Tests for logging setup and configuration."""

    def test_setup_logging_json_format(self):
        """Test logging setup with JSON format."""
        setup_logging(log_level="INFO", log_format="json")
        logger = logging.getLogger()

        assert logger.level == logging.INFO
        assert len(logger.handlers) > 0

        # Check handler has JSON formatter
        handler = logger.handlers[0]
        assert isinstance(handler.formatter, CustomJsonFormatter)

    def test_setup_logging_text_format(self):
        """Test logging setup with text format."""
        setup_logging(log_level="DEBUG", log_format="text")
        logger = logging.getLogger()

        assert logger.level == logging.DEBUG
        assert len(logger.handlers) > 0

        # Check handler has text formatter
        handler = logger.handlers[0]
        assert isinstance(handler.formatter, logging.Formatter)
        assert not isinstance(handler.formatter, CustomJsonFormatter)

    def test_get_logger(self):
        """Test getting a configured logger instance."""
        logger = get_logger("test_module")

        assert isinstance(logger, logging.Logger)
        assert logger.name == "test_module"


class TestRequestLogger:
    """Tests for thread-safe request logger adapter."""

    def test_get_request_logger_basic(self):
        """Test creating request logger with context."""
        logger = get_logger("test")
        request_logger = get_request_logger(
            logger, request_id="req-123", user_id="user-456"
        )

        assert isinstance(request_logger, logging.LoggerAdapter)
        assert request_logger.extra["request_id"] == "req-123"
        assert request_logger.extra["user_id"] == "user-456"

    def test_request_logger_adds_context_to_logs(self, caplog):
        """Test that request logger adds context to log records."""
        # Don't call setup_logging() - use caplog's default handler
        logger = get_logger("test_context")
        request_logger = get_request_logger(
            logger, request_id="req-abc", user_id="user-xyz"
        )

        # Capture log output
        with caplog.at_level(logging.INFO, logger="test_context"):
            request_logger.info("Test message with context")

        # Verify log record has context
        assert len(caplog.records) >= 1
        # Find the record with our message
        record = next(r for r in caplog.records if "Test message with context" in r.message)
        assert record.request_id == "req-abc"
        assert record.user_id == "user-xyz"
        assert record.message == "Test message with context"

    def test_request_logger_merges_extra_fields(self, caplog):
        """Test that request logger merges extra fields with context."""
        # Don't call setup_logging() - use caplog's default handler
        logger = get_logger("test_merge")
        request_logger = get_request_logger(logger, request_id="req-123")

        # Log with additional extra fields
        with caplog.at_level(logging.INFO, logger="test_merge"):
            request_logger.info("Test merge", extra={"operation": "create_product"})

        # Verify both context and extra fields are present
        assert len(caplog.records) >= 1
        record = next(r for r in caplog.records if "Test merge" in r.message)
        assert record.request_id == "req-123"
        assert record.operation == "create_product"

    def test_request_logger_thread_safety(self):
        """Test that multiple request loggers don't interfere with each other."""
        logger = get_logger("test_thread_safety")

        # Create two separate request loggers (simulating concurrent requests)
        logger1 = get_request_logger(logger, request_id="req-001", user_id="user-1")
        logger2 = get_request_logger(logger, request_id="req-002", user_id="user-2")

        # Verify each logger maintains its own context
        assert logger1.extra["request_id"] == "req-001"
        assert logger1.extra["user_id"] == "user-1"
        assert logger2.extra["request_id"] == "req-002"
        assert logger2.extra["user_id"] == "user-2"

        # Verify they don't share state
        logger1.extra["new_field"] = "value1"
        assert "new_field" not in logger2.extra


class TestLogRequest:
    """Tests for HTTP request logging helper."""

    def test_log_request_success(self, caplog):
        """Test logging successful HTTP request."""
        # Don't call setup_logging() - use caplog's default handler
        with caplog.at_level(logging.INFO, logger="wms.http"):
            log_request(
                method="GET",
                path="/api/v1/products",
                status_code=200,
                duration_ms=45.3,
                user_id="user-123",
                request_id="req-abc",
            )

        assert len(caplog.records) >= 1
        record = next(r for r in caplog.records if r.name == "wms.http")
        assert record.http_method == "GET"
        assert record.http_path == "/api/v1/products"
        assert record.http_status == 200
        assert record.duration_ms == 45.3
        assert record.user_id == "user-123"
        assert record.request_id == "req-abc"
        assert record.levelname == "INFO"

    def test_log_request_client_error(self, caplog):
        """Test logging HTTP request with 4xx status."""
        # Don't call setup_logging() - use caplog's default handler
        with caplog.at_level(logging.WARNING, logger="wms.http"):
            log_request(
                method="POST",
                path="/api/v1/auth/login",
                status_code=401,
                duration_ms=12.5,
            )

        assert len(caplog.records) >= 1
        record = next(r for r in caplog.records if r.name == "wms.http")
        assert record.http_status == 401
        assert record.levelname == "WARNING"

    def test_log_request_server_error(self, caplog):
        """Test logging HTTP request with 5xx status."""
        # Don't call setup_logging() - use caplog's default handler
        with caplog.at_level(logging.ERROR, logger="wms.http"):
            log_request(
                method="GET",
                path="/api/v1/products/123",
                status_code=500,
                duration_ms=230.1,
            )

        assert len(caplog.records) >= 1
        record = next(r for r in caplog.records if r.name == "wms.http")
        assert record.http_status == 500
        assert record.levelname == "ERROR"


class TestCustomJsonFormatter:
    """Tests for custom JSON log formatter."""

    def test_json_formatter_adds_required_fields(self):
        """Test that JSON formatter adds all required fields."""
        # Setup JSON logging
        setup_logging(log_level="INFO", log_format="json")

        # Create a string buffer to capture log output
        log_stream = StringIO()
        handler = logging.StreamHandler(log_stream)
        handler.setFormatter(
            CustomJsonFormatter(fmt="%(timestamp)s %(level)s %(message)s")
        )

        logger = logging.getLogger("test_json")
        logger.handlers = [handler]
        logger.setLevel(logging.INFO)

        # Log a message
        logger.info("Test JSON output", extra={"custom_field": "custom_value"})

        # Parse JSON output
        log_output = log_stream.getvalue()
        log_data = json.loads(log_output)

        # Verify required fields are present
        assert "timestamp" in log_data
        assert "level" in log_data
        assert log_data["level"] == "INFO"
        assert "app" in log_data
        assert log_data["app"] == "wms"
        assert "version" in log_data
        assert "phase" in log_data
        assert "logger" in log_data
        assert "module" in log_data
        assert "function" in log_data
        assert "line" in log_data
        assert "process" in log_data
        assert "thread" in log_data
        assert "message" in log_data
        assert log_data["message"] == "Test JSON output"
        assert "custom_field" in log_data
        assert log_data["custom_field"] == "custom_value"

    def test_json_formatter_handles_exceptions(self):
        """Test that JSON formatter properly formats exceptions."""
        setup_logging(log_level="INFO", log_format="json")

        log_stream = StringIO()
        handler = logging.StreamHandler(log_stream)
        handler.setFormatter(
            CustomJsonFormatter(fmt="%(timestamp)s %(level)s %(message)s")
        )

        logger = logging.getLogger("test_exception")
        logger.handlers = [handler]
        logger.setLevel(logging.ERROR)

        # Log an exception
        try:
            raise ValueError("Test exception")
        except ValueError:
            logger.exception("An error occurred")

        # Parse JSON output
        log_output = log_stream.getvalue()
        log_data = json.loads(log_output)

        # Verify exception field is present
        assert "exception" in log_data
        assert "ValueError: Test exception" in log_data["exception"]
        assert "Traceback" in log_data["exception"]
