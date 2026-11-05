"""FastAPI entry point. Run with: ``uvicorn app.main:app --reload``"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.content.loader import get_catalog
from app.routers import courses, lessons


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Load and validate all course content at startup. Broken content fails the deploy,
    # not a student's lesson.
    get_catalog()
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Lessons, questions and answer grading for Quantic Learning.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router, prefix="/api/v1")
app.include_router(lessons.router, prefix="/api/v1")


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}
