from fastapi import APIRouter
from app.api.v1.datasets import router as datasets_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.models import router as models_router
from app.api.v1.topics import router as topics_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.investigations import router as investigations_router
from app.api.v1.reports import router as reports_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(datasets_router)
api_v1_router.include_router(complaints_router)
api_v1_router.include_router(models_router)
api_v1_router.include_router(topics_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(investigations_router)
api_v1_router.include_router(reports_router)

__all__ = ["api_v1_router"]
