"""Public API shapes.

These are deliberately separate from the content models: what we store (with answers) is
not what we send. Lesson payloads never include answers. The server grades each attempt.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.content.graphs import sample_curve
from app.content.models import (
    CalloutBlock,
    Color,
    Course,
    GraphBlock,
    ImageBlock,
    Lesson,
    LessonKind,
    MathInputQuestion,
    MultipleChoiceQuestion,
    TeachCard,
    TextBlock,
    Unit,
)


class LessonSummary(BaseModel):
    id: str
    kind: LessonKind
    topic: str | None
    title: str
    description: str
    xp: int
    question_count: int
    card_count: int

    @classmethod
    def of(cls, lesson: Lesson) -> LessonSummary:
        return cls(
            id=lesson.id,
            kind=lesson.kind,
            topic=lesson.topic,
            title=lesson.title,
            description=lesson.description,
            xp=lesson.xp,
            question_count=len(lesson.questions),
            card_count=len(lesson.cards),
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
    category: str
    grade: int | None
    grade_label: str
    status: Literal["available", "coming_soon"]
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
            category=course.category,
            grade=course.grade,
            grade_label=course.grade_label,
            status=course.status,
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


# --- Visual blocks, ready to draw ---------------------------------------------------------


class PublicCurve(BaseModel):
    color: Color
    label: str | None
    dashed: bool
    paths: list[list[tuple[float, float]]]  # polylines; gaps where the curve is undefined


class PublicSegment(BaseModel):
    start: tuple[float, float]
    end: tuple[float, float]
    color: Color
    label: str | None
    dashed: bool
    arrow: bool


class PublicPoint(BaseModel):
    at: tuple[float, float]
    label: str | None
    color: Color
    open: bool


class PublicGraph(BaseModel):
    type: Literal["graph"] = "graph"
    x: tuple[float, float]
    y: tuple[float, float]
    x_label: str
    y_label: str
    grid: bool
    aspect: float
    curves: list[PublicCurve]
    segments: list[PublicSegment]
    points: list[PublicPoint]
    caption: str | None


class PublicImage(BaseModel):
    type: Literal["image"] = "image"
    url: str  # relative to the API host, e.g. /assets/mcv4u/derivative-machine.svg
    alt: str
    aspect: float
    caption: str | None


class PublicText(BaseModel):
    type: Literal["text"] = "text"
    md: str


class PublicCallout(BaseModel):
    type: Literal["callout"] = "callout"
    tone: Literal["key", "tip", "warning"]
    title: str | None
    md: str


PublicBlock = Annotated[
    PublicText | PublicCallout | PublicGraph | PublicImage, Field(discriminator="type")
]
PublicFigure = Annotated[PublicGraph | PublicImage, Field(discriminator="type")]


def public_graph(graph: GraphBlock) -> PublicGraph:
    x0, x1 = graph.x
    y0, y1 = graph.y
    return PublicGraph(
        x=graph.x,
        y=graph.y,
        x_label=graph.x_label,
        y_label=graph.y_label,
        grid=graph.grid,
        aspect=graph.aspect,
        curves=[
            PublicCurve(
                color=c.color,
                label=c.label,
                dashed=c.dashed,
                paths=sample_curve(c.expr, *(c.domain or (x0, x1)), y0, y1),
            )
            for c in graph.curves
        ],
        segments=[
            PublicSegment(
                start=s.start,
                end=s.end,
                color=s.color,
                label=s.label,
                dashed=s.dashed,
                arrow=s.arrow,
            )
            for s in graph.segments
        ],
        points=[
            PublicPoint(at=p.at, label=p.label, color=p.color, open=p.open) for p in graph.points
        ],
        caption=graph.caption,
    )


def public_block(block: TextBlock | CalloutBlock | GraphBlock | ImageBlock) -> PublicBlock:
    if isinstance(block, GraphBlock):
        return public_graph(block)
    if isinstance(block, ImageBlock):
        return PublicImage(
            url=f"/assets/{block.src}", alt=block.alt, aspect=block.aspect, caption=block.caption
        )
    if isinstance(block, CalloutBlock):
        return PublicCallout(tone=block.tone, title=block.title, md=block.md)
    return PublicText(md=block.md)


# --- Lesson items -------------------------------------------------------------------------


class PublicTeachCard(BaseModel):
    id: str
    type: Literal["teach"] = "teach"
    title: str
    blocks: list[PublicBlock]


class PublicMultipleChoice(BaseModel):
    id: str
    type: Literal["multiple_choice"] = "multiple_choice"
    prompt: str
    figure: PublicFigure | None
    hint: str | None
    choices: list[str | PublicGraph]


class PublicMathInput(BaseModel):
    id: str
    type: Literal["math_input"] = "math_input"
    prompt: str
    figure: PublicFigure | None
    hint: str | None
    variables: list[str]
    placeholder: str | None


PublicItem = Annotated[
    PublicTeachCard | PublicMultipleChoice | PublicMathInput, Field(discriminator="type")
]


def public_item(item: TeachCard | MultipleChoiceQuestion | MathInputQuestion) -> PublicItem:
    if isinstance(item, TeachCard):
        return PublicTeachCard(
            id=item.id, title=item.title, blocks=[public_block(b) for b in item.blocks]
        )
    figure = public_block(item.figure) if item.figure is not None else None
    if isinstance(item, MultipleChoiceQuestion):
        return PublicMultipleChoice(
            id=item.id,
            prompt=item.prompt,
            figure=figure,
            hint=item.hint,
            choices=[c if isinstance(c, str) else public_graph(c) for c in item.choices],
        )
    return PublicMathInput(
        id=item.id,
        prompt=item.prompt,
        figure=figure,
        hint=item.hint,
        variables=item.variables,
        placeholder=item.placeholder,
    )


class LessonDetail(BaseModel):
    id: str
    kind: LessonKind
    topic: str | None
    title: str
    description: str
    xp: int
    course_id: str
    course_code: str
    unit_id: str
    items: list[PublicItem]


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
