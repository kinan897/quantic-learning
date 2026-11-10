import uuid

from fastapi import APIRouter, HTTPException, status

from app.content.loader import Catalog, LessonRef
from app.content.models import MultipleChoiceQuestion
from app.dependencies import CatalogDep, CurrentUser, DbSession
from app.grading import grade_choice, grade_math
from app.models import Attempt, LessonSession, User
from app.schemas import (
    CheckRequest,
    CheckResponse,
    LessonDetail,
    RewardOut,
    SessionOut,
    public_item,
)
from app.services.progress import (
    LessonLockedError,
    SessionStateError,
    complete_session,
    completed_lesson_ids,
    is_unlocked,
    start_session,
)

router = APIRouter(prefix="/lessons", tags=["lessons"])

LOCKED = "Finish the previous lesson to unlock this one."


def _lesson_or_404(lesson_id: str, catalog: Catalog) -> LessonRef:
    ref = catalog.lessons.get(lesson_id)
    if ref is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    return ref


def _open_session(
    db: DbSession, user: User, session_id: uuid.UUID, lesson_id: str
) -> LessonSession:
    session = db.get(LessonSession, session_id)
    if session is None or session.user_id != user.id or session.lesson_id != lesson_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson session not found")
    if session.completed_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This lesson session is already complete.")
    return session


@router.get("/{lesson_id}", response_model=LessonDetail)
def get_lesson(
    lesson_id: str, user: CurrentUser, db: DbSession, catalog: CatalogDep
) -> LessonDetail:
    ref = _lesson_or_404(lesson_id, catalog)
    if not is_unlocked(ref, completed_lesson_ids(db, user, ref.course.id)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, LOCKED)
    lesson = ref.lesson
    return LessonDetail(
        id=lesson.id,
        kind=lesson.kind,
        topic=lesson.topic,
        title=lesson.title,
        description=lesson.description,
        xp=lesson.xp,
        course_id=ref.course.id,
        unit_id=ref.unit.id,
        items=[public_item(item) for item in lesson.items],
    )


@router.post(
    "/{lesson_id}/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED
)
def begin_session(
    lesson_id: str, user: CurrentUser, db: DbSession, catalog: CatalogDep
) -> SessionOut:
    ref = _lesson_or_404(lesson_id, catalog)
    try:
        session = start_session(db, user, ref)
    except LessonLockedError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, LOCKED) from None
    return SessionOut(session_id=session.id, lesson_id=lesson_id)


@router.post("/{lesson_id}/sessions/{session_id}/complete", response_model=RewardOut)
def finish_session(
    lesson_id: str,
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    catalog: CatalogDep,
) -> RewardOut:
    ref = _lesson_or_404(lesson_id, catalog)
    session = _open_session(db, user, session_id, lesson_id)
    try:
        reward = complete_session(db, user, session, ref.lesson)
    except SessionStateError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from None
    return RewardOut(**reward.__dict__)


@router.post("/{lesson_id}/questions/{question_id}/check", response_model=CheckResponse)
def check_answer(
    lesson_id: str,
    question_id: str,
    body: CheckRequest,
    user: CurrentUser,
    db: DbSession,
    catalog: CatalogDep,
) -> CheckResponse:
    question = _lesson_or_404(lesson_id, catalog).lesson.question(question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    session = _open_session(db, user, body.session_id, lesson_id) if body.session_id else None

    if isinstance(question, MultipleChoiceQuestion):
        grade = grade_choice(body.answer, question.answer, len(question.choices))
        choice = question.choices[question.answer]
        reveal = {
            # Graph choices have no text; the app highlights the correct graph instead.
            "correct_answer": choice
            if isinstance(choice, str)
            else f"Option {'ABCDEF'[question.answer]}",
            "correct_choice": question.answer,
        }
    else:
        grade = grade_math(
            str(body.answer), question.answer, question.variables, question.tolerance
        )
        reveal = {"correct_answer": question.display_answer or question.answer}

    if grade.status == "invalid":
        # Not recorded: a typo isn't a wrong answer.
        return CheckResponse(result="invalid", message=grade.message)

    if session is not None:
        session.attempts.append(
            Attempt(
                question_id=question_id,
                answer=str(body.answer)[:200],
                correct=grade.status == "correct",
            )
        )
        db.commit()

    return CheckResponse(result=grade.status, explanation=question.explanation, **reveal)
