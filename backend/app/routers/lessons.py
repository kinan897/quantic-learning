from fastapi import APIRouter, HTTPException

from app.content.loader import Catalog, LessonRef
from app.content.models import MultipleChoiceQuestion
from app.dependencies import CatalogDep
from app.grading import grade_choice, grade_math
from app.schemas import CheckRequest, CheckResponse, LessonDetail, public_question

router = APIRouter(prefix="/lessons", tags=["lessons"])


def _lesson_or_404(lesson_id: str, catalog: Catalog) -> LessonRef:
    ref = catalog.lessons.get(lesson_id)
    if ref is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return ref


@router.get("/{lesson_id}", response_model=LessonDetail)
def get_lesson(lesson_id: str, catalog: CatalogDep) -> LessonDetail:
    ref = _lesson_or_404(lesson_id, catalog)
    lesson = ref.lesson
    return LessonDetail(
        id=lesson.id,
        title=lesson.title,
        description=lesson.description,
        xp=lesson.xp,
        course_id=ref.course.id,
        unit_id=ref.unit.id,
        questions=[public_question(q) for q in lesson.questions],
    )


@router.post("/{lesson_id}/questions/{question_id}/check", response_model=CheckResponse)
def check_answer(
    lesson_id: str,
    question_id: str,
    body: CheckRequest,
    catalog: CatalogDep,
) -> CheckResponse:
    question = _lesson_or_404(lesson_id, catalog).lesson.question(question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if isinstance(question, MultipleChoiceQuestion):
        grade = grade_choice(body.answer, question.answer, len(question.choices))
        if grade.status == "invalid":
            return CheckResponse(result="invalid", message=grade.message)
        return CheckResponse(
            result=grade.status,
            correct_answer=question.choices[question.answer],
            correct_choice=question.answer,
            explanation=question.explanation,
        )

    grade = grade_math(str(body.answer), question.answer, question.variables, question.tolerance)
    if grade.status == "invalid":
        return CheckResponse(result="invalid", message=grade.message)
    return CheckResponse(
        result=grade.status,
        correct_answer=question.display_answer or question.answer,
        explanation=question.explanation,
    )
