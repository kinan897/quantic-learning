"""Lesson unlocking, XP and streaks. The server decides all of it.

The client never reports a score. It starts a lesson session, every answer is graded and
recorded here, and on completion the server checks that every question was eventually
answered correctly, then works out the XP from the recorded attempts.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.content.loader import LessonRef
from app.content.models import Lesson
from app.db import utcnow
from app.models import DailyXp, LessonProgress, LessonSession, User

PERFECT_BONUS_XP = 5
WEEK = 7


class LessonLockedError(Exception):
    pass


class SessionStateError(Exception):
    """The session can't be used this way (already completed, or unfinished)."""


@dataclass(frozen=True)
class Reward:
    xp_earned: int
    perfect_bonus: int
    accuracy: float
    streak: int
    streak_extended: bool
    first_completion: bool
    total_xp: int


def local_today(user: User, now: datetime | None = None) -> date:
    return (now or utcnow()).astimezone(ZoneInfo(user.timezone)).date()


def current_streak(user: User, today: date) -> int:
    """The streak as it stands today. It drops to 0 once a whole day is missed."""
    if user.last_active_date in (today, today - timedelta(days=1)):
        return user.streak_count
    return 0


def completed_lesson_ids(db: Session, user: User, course_id: str) -> set[str]:
    return set(
        db.scalars(
            select(LessonProgress.lesson_id).where(
                LessonProgress.user_id == user.id, LessonProgress.course_id == course_id
            )
        )
    )


def is_unlocked(ref: LessonRef, completed: set[str]) -> bool:
    """A lesson is open if it's the first one, already done, or the one before it is done.

    "Already done" matters when new lessons are added to a course later: students keep
    access to lessons they finished, even if a new lesson now sits before them.
    """
    ordered = [lesson.id for unit in ref.course.units for lesson in unit.lessons]
    index = ordered.index(ref.lesson.id)
    return index == 0 or ref.lesson.id in completed or ordered[index - 1] in completed


def start_session(db: Session, user: User, ref: LessonRef) -> LessonSession:
    if not is_unlocked(ref, completed_lesson_ids(db, user, ref.course.id)):
        raise LessonLockedError
    session = LessonSession(user_id=user.id, course_id=ref.course.id, lesson_id=ref.lesson.id)
    db.add(session)
    db.commit()
    return session


def complete_session(db: Session, user: User, session: LessonSession, lesson: Lesson) -> Reward:
    if session.completed_at is not None:
        raise SessionStateError("This lesson session is already complete.")

    first_try: dict[str, bool] = {}
    solved: set[str] = set()
    for attempt in session.attempts:
        first_try.setdefault(attempt.question_id, attempt.correct)
        if attempt.correct:
            solved.add(attempt.question_id)

    question_ids = [q.id for q in lesson.questions]
    if any(qid not in solved for qid in question_ids):
        raise SessionStateError("Answer every question correctly to finish the lesson.")

    accuracy = sum(1 for qid in question_ids if first_try.get(qid)) / len(question_ids)
    progress = db.get(LessonProgress, (user.id, lesson.id))
    first_completion = progress is None

    # Full XP the first time, half for practice replays, plus a bonus for a flawless run.
    lesson_xp = lesson.xp if first_completion else math.ceil(lesson.xp / 2)
    perfect_bonus = PERFECT_BONUS_XP if accuracy == 1 else 0
    xp = lesson_xp + perfect_bonus

    now = utcnow()
    today = local_today(user, now)
    streak_extended = user.last_active_date != today
    if streak_extended:
        continues = user.last_active_date == today - timedelta(days=1)
        user.streak_count = user.streak_count + 1 if continues else 1
        user.last_active_date = today
    user.total_xp += xp

    daily = db.get(DailyXp, (user.id, today))
    if daily is None:
        db.add(DailyXp(user_id=user.id, day=today, xp=xp))
    else:
        daily.xp += xp

    if progress is None:
        db.add(
            LessonProgress(
                user_id=user.id,
                lesson_id=lesson.id,
                course_id=session.course_id,
                times_completed=1,
                best_accuracy=accuracy,
                first_completed_at=now,
                last_completed_at=now,
            )
        )
    else:
        progress.times_completed += 1
        progress.best_accuracy = max(progress.best_accuracy, accuracy)
        progress.last_completed_at = now

    session.completed_at = now
    db.commit()

    return Reward(
        xp_earned=xp,
        perfect_bonus=perfect_bonus,
        accuracy=accuracy,
        streak=user.streak_count,
        streak_extended=streak_extended,
        first_completion=first_completion,
        total_xp=user.total_xp,
    )


def weekly_xp(db: Session, user: User, today: date) -> list[tuple[date, int]]:
    start = today - timedelta(days=WEEK - 1)
    rows = db.scalars(select(DailyXp).where(DailyXp.user_id == user.id, DailyXp.day >= start))
    by_day = {row.day: row.xp for row in rows}
    return [
        (start + timedelta(days=i), by_day.get(start + timedelta(days=i), 0)) for i in range(WEEK)
    ]


def lesson_records(db: Session, user: User, course_id: str | None = None) -> list[LessonProgress]:
    query = select(LessonProgress).where(LessonProgress.user_id == user.id)
    if course_id:
        query = query.where(LessonProgress.course_id == course_id)
    return list(db.scalars(query))
