from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.routes import router as api_router


def create_app() -> FastAPI:
    app = FastAPI(description="nomothetisAI REST API")
    app.include_router(health_router)
    app.include_router(api_router)
    return app

app = create_app()
