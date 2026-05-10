from fastapi import APIRouter

from app.features.field_4.router import router as field_4_router
from app.features.field_6.router import router as field_6_router
from app.features.field_7.router import router as field_7_router
from app.features.field_9.router import router as field_9_router
from app.features.field_23.router import router as field_23_router
from app.features.field_29.router import router as field_29_router

router = APIRouter(prefix="/api")

router.include_router(field_4_router, prefix="/field-4", tags=["Field 4"])
router.include_router(field_6_router, prefix="/field-6", tags=["Field 6"])
router.include_router(field_7_router, prefix="/field-7", tags=["Field 7"])
router.include_router(field_9_router, prefix="/field-9", tags=["Field 9"])
router.include_router(field_23_router, prefix="/field-23", tags=["Field 23"])
router.include_router(field_29_router, prefix="/field-29", tags=["Field 29"])
