from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.routes import router as api_router
from app.core.config import settings
from app.features.field_6.router import router as field6_router
from app.features.field_9.router import router as field9_router


def create_app() -> FastAPI:
    app = FastAPI(description="nomothetisAI REST API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.app.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(api_router)
    return app

app = create_app()
