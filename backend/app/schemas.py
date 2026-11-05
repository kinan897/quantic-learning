"""Public API shapes.

These are deliberately separate from the content models: what we store (with answers) is
not what we send. Lesson payloads never include answers. The server grades each attempt.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.content.models import Course, Lesson, MathInputQuestion, MultipleChoiceQuestion, Unit


class LessonSummary(BaseModel):
    id: str
    title: str
    description: str
    xp: int
    question_count: int

    @classmethod
    def of(cls, lesson: Lesson) -> LessonSummary:
        return cls(
            id=lesson.id,
            title=lesson.title,
            description=lesson.description,
            xp=lesson.xp,
            question_count=len(lesson.questions),
        )


class UnitOut(BaseModel):
    id: str
    title: str
    description: str
    lessons: list[LessonSummary]

    @classmethod
    def of(cls, unit: Unit) -> UnitOut:
        return cls(
            id=unit.id,
            title=unit.title,
            description=unit.description,
            lessons=[LessonSummary.of(lesson) for lesson in unit.lessons],
        )


class CourseSummary(BaseModel):
    id: str
    code: str
    title: str
    subject: str
    level: str
    grade: int | None
    description: str
    unit_count: int
    lesson_count: int

    @classmethod
    def of(cls, course: Course) -> CourseSummary:
        return cls(
            id=course.id,
            code=course.code,
            title=course.title,
            subject=course.subject,
            level=course.level,
            grade=course.grade,
            description=course.description,
            unit_count=len(course.units),
            lesson_count=sum(len(u.lessons) for u in course.units),
        )


class CourseDetail(CourseSummary):
    prerequisites: list[str]
    units: list[UnitOut]

    @classmethod
    def of(cls, course: Course) -> CourseDetail:
        return cls(
            **CourseSummary.of(course).model_dump(),
            prerequisites=course.prerequisites,
            units=[UnitOut.of(u) for u in course.units],
        )


class PublicMultipleChoice(BaseModel):
    id: str
    type: Literal["multiple_choice"] = "multiple_choice"
    prompt: str
    hint: str | None
    choices: list[str]


class PublicMathInput(BaseModel):
    id: str
    type: Literal["math_input"] = "math_input"
    prompt: str
    hint: str | None
    variables: list[str]
    placeholder: str | None


PublicQuestion = Annotated[PublicMultipleChoice | PublicMathInput, Field(discriminator="type")]


def public_question(q: MultipleChoiceQuestion | MathInputQuestion) -> PublicQuestion:
    if isinstance(q, MultipleChoiceQuestion):
        return PublicMultipleChoice(id=q.id, prompt=q.prompt, hint=q.hint, choices=q.choices)
    return PublicMathInput(
        id=q.id, prompt=q.prompt, hint=q.hint, variables=q.variables, placeholder=q.placeholder
    )


class LessonDetail(BaseModel):
    id: str
    title: str
    description: str
    xp: int
    course_id: str
    unit_id: str
    questions: list[PublicQuestion]


class CheckRequest(BaseModel):
    # A choice index for multiple choice, or the typed expression for math input.
    answer: int | str = Field(examples=["2x + 5", 0])
    # When set, the attempt is recorded against this lesson session (needed to earn XP).
    session_id: uuid.UUID | None = None


class CheckResponse(BaseModel):
    result: Literal["correct", "incorrect", "invalid"]
    # For "invalid" only: why the input couldn't be read. Not a wrong answer, so no penalty.
    message: str | None = None
    # The fields below are revealed only after a graded (correct/incorrect) attempt.
    correct_answer: str | None = None
    correct_choice: int | None = None
    explanation: str | None = None


# --- Accounts -----------------------------------------------------------------------------


class GuestRequest(BaseModel):
    timezone: str | None = Field(default=None, max_length=64, examples=["America/Toronto"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=40)
    timezone: str | None = Field(default=None, max_length=64)

    @field_validator("display_name")
    @classmethod
    def _clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value or not value.isprintable():
            raise ValueError("Enter a name using letters, numbers and spaces.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str | None
    display_name: str | None
    is_guest: bool
    timezone: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut


# --- Progress -----------------------------------------------------------------------------


class DayXp(BaseModel):
    date: date
    xp: int


class LessonProgressOut(BaseModel):
    times_completed: int
    best_accuracy: float
    last_completed_at: datetime


class ProgressOut(BaseModel):
    total_xp: int
    streak: int
    today: date
    week: list[DayXp]
    lessons: dict[str, LessonProgressOut]


class SessionOut(BaseModel):
    session_id: uuid.UUID
    lesson_id: str


class RewardOut(BaseModel):
    xp_earned: int
    perfect_bonus: int
    accuracy: float
    streak: int
    streak_extended: bool
    first_completion: bool
    total_xp: int
