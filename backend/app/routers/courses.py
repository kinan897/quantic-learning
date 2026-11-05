from fastapi import APIRouter, HTTPException

from app.dependencies import CatalogDep
from app.schemas import CourseDetail, CourseSummary

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseSummary])
def list_courses(catalog: CatalogDep) -> list[CourseSummary]:
    return [CourseSummary.of(course) for course in catalog.courses.values()]


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(course_id: str, catalog: CatalogDep) -> CourseDetail:
    course = catalog.courses.get(course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseDetail.of(course)
