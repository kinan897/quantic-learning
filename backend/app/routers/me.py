from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas import DayXp, LessonProgressOut, ProgressOut, UserOut
from app.services.progress import current_streak, lesson_records, local_today, weekly_xp

router = APIRouter(prefix="/me", tags=["me"])


@router.get("", response_model=UserOut)
def get_me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user, from_attributes=True)


@router.get("/progress", response_model=ProgressOut)
def get_progress(user: CurrentUser, db: DbSession, course_id: str | None = None) -> ProgressOut:
    today = local_today(user)
    return ProgressOut(
        total_xp=user.total_xp,
        streak=current_streak(user, today),
        today=today,
        week=[DayXp(date=day, xp=xp) for day, xp in weekly_xp(db, user, today)],
        lessons={
            record.lesson_id: LessonProgressOut(
                times_completed=record.times_completed,
                best_accuracy=record.best_accuracy,
                last_completed_at=record.last_completed_at,
            )
            for record in lesson_records(db, user, course_id)
        },
    )
