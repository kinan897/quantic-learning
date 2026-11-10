"""Load and index course content from YAML.

Layout::

    app/content/<course-id>/course.yaml     course metadata + ordered list of unit files
    app/content/<course-id>/unit-*.yaml     one unit (with its lessons and questions) each
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import ValidationError

from .models import Course, ImageBlock, Lesson, Unit, iter_blocks

CONTENT_DIR = Path(__file__).parent
# Diagrams and pictures used in lessons; served by the API at /assets/.
ASSETS_DIRNAME = "assets"
ASSETS_DIR = CONTENT_DIR / ASSETS_DIRNAME


class ContentError(Exception):
    """Course content is malformed. The message names the file at fault."""


@dataclass(frozen=True)
class LessonRef:
    course: Course
    unit: Unit
    lesson: Lesson


@dataclass
class Catalog:
    courses: dict[str, Course] = field(default_factory=dict)
    lessons: dict[str, LessonRef] = field(default_factory=dict)

    @classmethod
    def from_courses(cls, courses: list[Course]) -> Catalog:
        catalog = cls()
        for course in courses:
            if course.id in catalog.courses:
                raise ContentError(f"Duplicate course id {course.id!r}")
            catalog.courses[course.id] = course
            for unit in course.units:
                for lesson in unit.lessons:
                    if lesson.id in catalog.lessons:
                        raise ContentError(f"Lesson id {lesson.id!r} is used more than once")
                    catalog.lessons[lesson.id] = LessonRef(course, unit, lesson)
        return catalog


def load_course(course_dir: Path) -> Course:
    meta_path = course_dir / "course.yaml"
    meta = _read_yaml(meta_path)
    unit_files = meta.pop("units", None)
    if not isinstance(unit_files, list) or not unit_files:
        raise ContentError(f"{meta_path}: 'units' must list at least one unit file")

    units = []
    for name in unit_files:
        unit_path = course_dir / name
        try:
            unit = Unit.model_validate(_read_yaml(unit_path))
        except ValidationError as exc:
            raise ContentError(f"{unit_path}:\n{exc}") from exc
        _check_images(unit, unit_path, course_dir.parent / ASSETS_DIRNAME)
        units.append(unit)

    try:
        return Course.model_validate({**meta, "units": units})
    except ValidationError as exc:
        raise ContentError(f"{meta_path}:\n{exc}") from exc


def _check_images(unit: Unit, unit_path: Path, assets_dir: Path) -> None:
    for lesson in unit.lessons:
        for block in iter_blocks(lesson):
            if isinstance(block, ImageBlock) and not (assets_dir / block.src).is_file():
                raise ContentError(f"{unit_path}: image {block.src!r} not found in {assets_dir}")


def load_catalog(root: Path = CONTENT_DIR) -> Catalog:
    course_dirs = sorted(p for p in root.iterdir() if (p / "course.yaml").is_file())
    return Catalog.from_courses([load_course(d) for d in course_dirs])


@lru_cache
def get_catalog() -> Catalog:
    """The app-wide catalog, loaded once. Overridden in tests via FastAPI dependencies."""
    return load_catalog()


def _read_yaml(path: Path) -> dict:
    if not path.is_file():
        raise ContentError(f"Missing content file: {path}")
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ContentError(f"{path}: invalid YAML\n{exc}") from exc
    if not isinstance(data, dict):
        raise ContentError(f"{path}: expected a mapping at the top level")
    return data
