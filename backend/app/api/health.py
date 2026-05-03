"""Health check endpoints for liveness / readiness probes."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
def health() -> dict[str, str]:
    """Returns 200 if the process is alive.

    No side effects — must remain cheap so orchestrators (Docker, k8s)
    can hit it frequently without cost.
    """
    return {"status": "ok"}


@router.get("/ready", summary="Readiness probe")
def ready() -> dict[str, str]:
    """Returns 200 if the app is ready to serve traffic."""
    return {"status": "ready"}
