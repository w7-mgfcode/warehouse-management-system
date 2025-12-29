"""FastAPI application factory and configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import router as api_router
from app.core.config import settings
from app.core.rate_limit import authenticated_limiter, rate_limit_exceeded_handler


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI: Configured application instance.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description="Warehouse Management System API with FEFO support",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure properly in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register SlowAPI rate limiter
    # This enables default rate limiting (100/minute per user/IP)
    app.state.limiter = authenticated_limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Include API router
    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        """Health check endpoint."""
        return {"status": "healthy"}

    return app


app = create_app()
