import logging
import time

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Deep health check — DB connectivity + app info.
    Used by Railway healthcheck and uptime monitors.
    """
    start = time.perf_counter()
    db_status = "ok"
    db_latency_ms = None

    try:
        await db.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - start) * 1000, 2)
    except Exception as e:
        logger.error("Health check DB ping failed: %s", e)
        db_status = "unreachable"

    overall = "ok" if db_status == "ok" else "degraded"

    return {
        "status": overall,
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "checks": {
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms,
            }
        },
    }