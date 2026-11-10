"""Load and index course content from YAML.

Layout::

    app/content/subjects.yaml               subject tiles (Math, Physics, ...) in display order
    app/content/<course-id>/course.yaml     course metadata + ordered list of unit files
    app/content/<course-id>/unit-*.yaml     one unit (with its lessons and questions) each
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import ValidationError

from .models import Course, ImageBlock, Lesson, Subject, Unit, iter_blocks

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
    subjects: list[Subject] = field(default_factory=list)

    def courses_in(self, subject_id: str) -> list[Course]:
        return [c for c in self.courses.values() if c.group == subject_id]

    @classmethod
    def from_courses(cls, courses: list[Course], subjects: list[Subject] | None = None) -> Catalog:
        catalog = cls(subjects=subjects or [])
        subject_ids = {s.id for s in catalog.subjects}
        for course in courses:
            if subjects is not None and course.group not in subject_ids:
                raise ContentError(f"Course {course.id!r} has unknown group {course.group!r}")
            if course.id in catalog.courses:
                raise ContentError(f"Duplicate course id {course.id!r}")
            catalog.courses[course.id] = course
            for unit in course.units:
                for lesson in unit.lessons:
                    if lesson.id in catalog.lessons:
                        raise ContentError(f"Lesson id {lesson.id!r} is used more than once")
                    catalog.lessons[lesson.id] = LessonRef(course, unit, lesson)
        for subject in catalog.subjects:
            if not catalog.courses_in(subject.id):
                raise ContentError(f"Subject {subject.id!r} has no courses")
        return catalog


def load_course(course_dir: Path) -> Course:
    meta_path = course_dir / "course.yaml"
    meta = _read_yaml(meta_path)
    unit_files = meta.pop("units", None) or []
    if not isinstance(unit_files, list):
        raise ContentError(f"{meta_path}: 'units' must be a list of unit files")

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
    course_dirs = [p for p in root.iterdir() if (p / "course.yaml").is_file()]
    courses = sorted((load_course(d) for d in course_dirs), key=lambda c: (c.order, c.id))
    return Catalog.from_courses(courses, load_subjects(root / "subjects.yaml"))


def load_subjects(path: Path) -> list[Subject]:
    data = _read_yaml(path).get("subjects")
    if not isinstance(data, list):
        raise ContentError(f"{path}: 'subjects' must be a list")
    try:
        subjects = [Subject.model_validate(item) for item in data]
    except ValidationError as exc:
        raise ContentError(f"{path}:\n{exc}") from exc
    ids = [s.id for s in subjects]
    if len(ids) != len(set(ids)):
        raise ContentError(f"{path}: duplicate subject id")
    return subjects


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
