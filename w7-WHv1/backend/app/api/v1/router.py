"""Main API v1 router combining all endpoints."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.bins import router as bins_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.inventory import router as inventory_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.movements import router as movements_router
from app.api.v1.products import router as products_router
from app.api.v1.reports import router as reports_router
from app.api.v1.reservations import router as reservations_router
from app.api.v1.suppliers import router as suppliers_router
from app.api.v1.transfers import router as transfers_router
from app.api.v1.users import router as users_router
from app.api.v1.warehouses import router as warehouses_router

router = APIRouter(prefix="/api/v1")

router.include_router(auth_router)
router.include_router(dashboard_router)
router.include_router(users_router)
router.include_router(warehouses_router)
router.include_router(products_router)
router.include_router(suppliers_router)
router.include_router(bins_router)
router.include_router(inventory_router)
router.include_router(movements_router)
router.include_router(transfers_router)
router.include_router(reservations_router)
router.include_router(jobs_router)
router.include_router(reports_router)
