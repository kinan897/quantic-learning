"""Database tables.

Course content lives in YAML (see app/content). The database stores only what changes per
student: accounts, login sessions, lesson attempts and progress.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime, utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Guests have no email or password until they sign up. Emails are stored lowercase.
    email: Mapped[str | None] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(40))
    is_guest: Mapped[bool] = mapped_column(Boolean, default=True)
    # IANA timezone, e.g. "America/Toronto". Streaks follow the student's own calendar day.
    timezone: Mapped[str] = mapped_column(String(64), default="America/Toronto")

    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    streak_count: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class RefreshToken(Base):
    """A long-lived login. Only a SHA-256 hash is stored, never the token itself.

    Tokens rotate: each refresh revokes the old token and issues a new one in the same
    *family*. If a revoked token is ever used again, it was probably stolen, so the whole
    family is revoked and that device has to sign in again.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class LessonSession(Base):
    """One play-through of a lesson. XP is awarded from the attempts recorded here,
    so the server never takes the client's word for a score."""

    __tablename__ = "lesson_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[str] = mapped_column(String(60))
    lesson_id: Mapped[str] = mapped_column(String(60), index=True)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    attempts: Mapped[list[Attempt]] = relationship(
        back_populates="session", order_by="Attempt.id", cascade="all, delete-orphan"
    )


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lesson_sessions.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[str] = mapped_column(String(60))
    answer: Mapped[str] = mapped_column(String(200))
    correct: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    session: Mapped[LessonSession] = relationship(back_populates="attempts")


class LessonProgress(Base):
    """A student's record for one lesson: completions and best first-try accuracy."""

    __tablename__ = "lesson_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    lesson_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    course_id: Mapped[str] = mapped_column(String(60), index=True)
    times_completed: Mapped[int] = mapped_column(Integer, default=0)
    best_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    first_completed_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    last_completed_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class DailyXp(Base):
    """XP earned per local calendar day, for the weekly chart (and leagues later)."""

    __tablename__ = "daily_xp"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
