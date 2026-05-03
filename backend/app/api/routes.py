from fastapi import APIRouter

from app.features.field_4.router import router as field_4_router
from app.features.field_23.router import router as field_23_router

router = APIRouter(prefix="/api")

router.include_router(field_4_router, prefix="/field-4", tags=["Field 4"])
router.include_router(field_23_router, prefix="/field-23", tags=["Field 23"])