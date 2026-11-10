from fastapi import APIRouter, HTTPException

from app.dependencies import CatalogDep
from app.schemas import CourseDetail, CourseSummary, SubjectOut

router = APIRouter(prefix="/courses", tags=["courses"])
subjects_router = APIRouter(prefix="/subjects", tags=["courses"])


@subjects_router.get("", response_model=list[SubjectOut])
def list_subjects(catalog: CatalogDep) -> list[SubjectOut]:
    """Subject tiles for the Courses tab, each with its courses (e.g. Physics: SPH3U, SPH4U)."""
    return [
        SubjectOut(
            id=s.id,
            title=s.title,
            tagline=s.tagline,
            icon=s.icon,
            courses=[CourseSummary.of(c) for c in catalog.courses_in(s.id)],
        )
        for s in catalog.subjects
    ]


@router.get("", response_model=list[CourseSummary])
def list_courses(catalog: CatalogDep) -> list[CourseSummary]:
    return [CourseSummary.of(course) for course in catalog.courses.values()]


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(course_id: str, catalog: CatalogDep) -> CourseDetail:
    course = catalog.courses.get(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseDetail.of(course)
