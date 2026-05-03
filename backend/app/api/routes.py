from fastapi import APIRouter

from app.features.field_4.router import router as field_4_router

router = APIRouter()

router.include_router(field_4_router, prefix="/field-4", tags=["Field 4"])