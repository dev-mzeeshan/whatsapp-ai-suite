from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api.routes.tenants import router as tenants_router
from app.api.routes.ws import router as ws_router
from app.api.routes.conversations import router as conversations_router

from app.config import get_settings

settings = get_settings()


# --------------------------------------------------------------------------- #
#  Application state                                                            #
# --------------------------------------------------------------------------- #

class AppState:
    """
    Typed container for objects that live for the lifetime of the process.
    Attach to app.state so every request handler can access them via
    request.app.state.http_client, etc.
    """
    http_client: httpx.AsyncClient


# --------------------------------------------------------------------------- #
#  Lifespan — startup / shutdown                                               #
# --------------------------------------------------------------------------- #

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Everything before 'yield' runs on startup.
    Everything after 'yield' runs on shutdown.
    This replaces the deprecated @app.on_event("startup") pattern.
    """
    # -- Startup --
    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=5.0),
        headers={
            "Authorization": f"Bearer {settings.META_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
    )

    # DB engine will be initialised here in Step 3 (session.py)
    # WebSocket manager will be initialised here in Phase 3

    yield

    # -- Shutdown --
    await app.state.http_client.aclose()


# --------------------------------------------------------------------------- #
#  Factory                                                                      #
# --------------------------------------------------------------------------- #

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        docs_url="/docs" if settings.APP_DEBUG else None,  # hide Swagger in prod
        redoc_url=None,
        lifespan=lifespan,
    )

    # ------------------------------------------------------------------ #
    #  Middleware                                                           #
    # ------------------------------------------------------------------ #
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Hub-Signature-256", "x-internal-key"],
    )

    # ------------------------------------------------------------------ #
    #  Routers — registered here, implemented in api/routes/              #
    # ------------------------------------------------------------------ #
    from app.api.routes.health import router as health_router
    from app.api.routes.webhook import router as webhook_router

    from app.api.routes.internal import router as internal_router
    app.include_router(internal_router, prefix="/internal", tags=["internal"])

    app.include_router(health_router, tags=["ops"])
    app.include_router(webhook_router, prefix="/webhook", tags=["webhook"])

    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(tenants_router, prefix="/tenants", tags=["tenants"])
    app.include_router(ws_router, prefix="/ws", tags=["websocket"])
    app.include_router(conversations_router, prefix="/conversations", tags=["conversations"])

    return app

# The ASGI app — this is what uvicorn points at.
app = create_app()

@app.get("/health")
def health_check():
    return {"status": "healthy"}