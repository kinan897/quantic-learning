"""FastAPI entry point. Run with: ``uvicorn app.main:app --reload``"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.config import get_settings
from app.content.loader import ASSETS_DIR, get_catalog
from app.routers import auth, courses, lessons, me

BACKEND_DIR = Path(__file__).resolve().parent.parent


def run_migrations() -> None:
    from alembic import command
    from alembic.config import Config

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    command.upgrade(config, "head")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Load and validate all course content at startup. Broken content fails the deploy,
    # not a student's lesson.
    get_catalog()
    if get_settings().auto_migrate:
        run_migrations()
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Lessons, answer grading, accounts and progress for Quantic Learning.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth.router, me.router, courses.router, lessons.router):
    app.include_router(router, prefix="/api/v1")

# Lesson diagrams and pictures (app/content/assets), referenced by image blocks.
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}
