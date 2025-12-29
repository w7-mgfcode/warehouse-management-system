"""
Rate limiting configuration for WMS API using SlowAPI.

Protects against abuse and ensures fair resource usage.
Default: 100 requests per minute per IP address.
"""

import logging
from collections.abc import Callable

from fastapi import Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Initialize limiter with IP-based rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri="memory://",  # Use Redis in production via VALKEY_URL
    strategy="fixed-window",
    headers_enabled=True,
)


def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key based on user authentication.

    Authenticated users are rate-limited per user ID.
    Unauthenticated requests are rate-limited per IP.

    Args:
        request (Request): FastAPI request object

    Returns:
        str: Rate limit key
    """
    # Check if user is authenticated (from JWT middleware)
    user_id = getattr(request.state, "user_id", None)

    if user_id:
        return f"user:{user_id}"

    # Fallback to IP address for unauthenticated requests
    return get_remote_address(request)


# Create limiter with custom key function
authenticated_limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100/minute"],
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=True,
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.

    Returns Hungarian error message with 429 status code.

    Args:
        request (Request): FastAPI request object
        exc (RateLimitExceeded): Rate limit exception

    Returns:
        JSONResponse: Error response with Hungarian message
    """
    logger.warning(
        f"Rate limit exceeded for {get_remote_address(request)} on {request.url.path}"
    )

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": "Túl sok kérés. Kérjük, próbálja újra később.",  # Too many requests. Please try again later.
            "error_code": "RATE_LIMIT_EXCEEDED",
        },
        headers={
            "Retry-After": str(exc.detail.split("Retry after ")[1].split(" ")[0])
            if "Retry after" in exc.detail
            else "60",
        },
    )


# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "auth": "20/minute",  # Stricter limit for authentication endpoints
    "read": "200/minute",  # Higher limit for read-only endpoints
    "write": "100/minute",  # Standard limit for write operations
    "bulk": "20/minute",  # Lower limit for bulk operations
    "reports": "50/minute",  # Medium limit for report generation
}


def get_rate_limit_for_endpoint(endpoint_type: str = "write") -> str:
    """
    Get rate limit string for endpoint type.

    Args:
        endpoint_type (str): Endpoint type (auth, read, write, bulk, reports)

    Returns:
        str: Rate limit string (e.g., "100/minute")
    """
    return RATE_LIMITS.get(endpoint_type, RATE_LIMITS["write"])


# Helper function to create route-specific limiters
def create_route_limiter(limit: str, key_func: Callable | None = None) -> Limiter:
    """
    Create a limiter instance for specific routes.

    Args:
        limit (str): Rate limit string (e.g., "100/minute")
        key_func (Callable, optional): Custom key function. Defaults to get_rate_limit_key.

    Returns:
        Limiter: Configured limiter instance

    Usage:
        from app.core.rate_limit import limiter

        # Apply to specific routes using decorator:
        @router.post("/auth/login")
        @limiter.limit("20/minute")
        async def login(request: Request, ...):
            ...

        # Or use predefined limits:
        from app.core.rate_limit import RATE_LIMITS

        @router.get("/products")
        @limiter.limit(RATE_LIMITS["read"])
        async def get_products(request: Request, ...):
            ...
    """
    return Limiter(
        key_func=key_func or get_rate_limit_key,
        default_limits=[limit],
        storage_uri="memory://",
        strategy="fixed-window",
        headers_enabled=True,
    )
