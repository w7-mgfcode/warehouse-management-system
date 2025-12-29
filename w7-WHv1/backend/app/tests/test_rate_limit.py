"""
Tests for rate limiting functionality.
"""

from fastapi.testclient import TestClient
from slowapi.errors import RateLimitExceeded

from app.core.rate_limit import (
    RATE_LIMITS,
    create_route_limiter,
    get_rate_limit_for_endpoint,
    get_rate_limit_key,
)
from app.main import app


class TestRateLimitConfiguration:
    """Tests for rate limit configuration."""

    def test_rate_limits_defined(self):
        """Test that all endpoint types have rate limits defined."""
        assert "auth" in RATE_LIMITS
        assert "read" in RATE_LIMITS
        assert "write" in RATE_LIMITS
        assert "bulk" in RATE_LIMITS
        assert "reports" in RATE_LIMITS

        # Verify values are in correct format
        assert RATE_LIMITS["auth"] == "20/minute"
        assert RATE_LIMITS["read"] == "200/minute"
        assert RATE_LIMITS["write"] == "100/minute"
        assert RATE_LIMITS["bulk"] == "20/minute"
        assert RATE_LIMITS["reports"] == "50/minute"

    def test_get_rate_limit_for_endpoint(self):
        """Test getting rate limit for endpoint type."""
        assert get_rate_limit_for_endpoint("auth") == "20/minute"
        assert get_rate_limit_for_endpoint("read") == "200/minute"
        assert get_rate_limit_for_endpoint("write") == "100/minute"
        assert get_rate_limit_for_endpoint("unknown") == "100/minute"  # Default


class TestRateLimitKeyGeneration:
    """Tests for rate limit key generation."""

    def test_get_rate_limit_key_authenticated(self):
        """Test rate limit key for authenticated user."""

        class MockRequest:
            class State:
                user_id = "user-123"

            state = State()

            @property
            def client(self):
                class Client:
                    host = "192.168.1.1"

                return Client()

        request = MockRequest()
        key = get_rate_limit_key(request)

        assert key == "user:user-123"

    def test_get_rate_limit_key_unauthenticated(self):
        """Test rate limit key for unauthenticated request."""

        class MockRequest:
            class State:
                user_id = None

            state = State()

            @property
            def client(self):
                class Client:
                    host = "192.168.1.100"

                return Client()

        request = MockRequest()
        key = get_rate_limit_key(request)

        # Should return IP address
        assert key == "192.168.1.100"


class TestCreateRouteLimiter:
    """Tests for creating route-specific limiters."""

    def test_create_route_limiter(self):
        """Test creating a route limiter."""
        limiter = create_route_limiter("50/minute")

        assert limiter is not None
        # Check that limiter has default limits configured
        assert len(limiter._default_limits) > 0
        # Verify limiter is a Limiter instance
        from slowapi import Limiter

        assert isinstance(limiter, Limiter)


class TestRateLimiterIntegration:
    """Integration tests for rate limiter with FastAPI app."""

    def test_rate_limiter_registered_in_app(self):
        """Test that rate limiter is registered in app state."""
        assert hasattr(app.state, "limiter")
        assert app.state.limiter is not None

    def test_rate_limit_exception_handler_registered(self):
        """Test that RateLimitExceeded exception handler is registered."""
        # Check that RateLimitExceeded is in exception handlers
        assert RateLimitExceeded in app.exception_handlers

    def test_health_endpoint_responds(self):
        """Test that health endpoint is accessible."""
        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    def test_api_documentation_accessible(self):
        """Test that API documentation endpoints are accessible."""
        client = TestClient(app)

        # OpenAPI JSON
        response = client.get("/openapi.json")
        assert response.status_code == 200

        # Swagger UI
        response = client.get("/docs")
        assert response.status_code == 200

        # ReDoc
        response = client.get("/redoc")
        assert response.status_code == 200
