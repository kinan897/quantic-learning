"""Content schema: Course → Unit → Lesson → items (teaching cards and questions).

Content lives in YAML files under ``app/content/<course>/``. It's validated against these
models when the app starts, so a typo in a question fails fast instead of reaching students.

Each topic is taught in three lessons:

- **learn**: teaching cards (text, graphs, diagrams) with quick check questions in between
- **practice**: easy questions that build the foundation, solvable without pen and paper
- **destroyer**: the hard, multi-step problems, once the basics are solid

Text fields are Markdown with LaTeX math between ``$...$``. The app renders them with KaTeX.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.grading.parser import ParseError, parse_expression, validate_variables

Slug = Annotated[str, Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=60)]
Text = Annotated[str, Field(min_length=1)]
Color = Literal["primary", "accent", "success", "error", "warning", "muted"]
Point = tuple[float, float]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, populate_by_name=True)


# --- Visual blocks ------------------------------------------------------------------------


class GraphCurve(_Strict):
    """y = expr(x), drawn over ``domain`` (defaults to the graph's x-range)."""

    expr: Text
    domain: Point | None = None
    color: Color = "primary"
    label: str | None = None
    dashed: bool = False

    @model_validator(mode="after")
    def _check(self) -> GraphCurve:
        try:
            parse_expression(self.expr, ["x"])
        except ParseError as exc:
            raise ValueError(f"curve {self.expr!r} doesn't parse: {exc}") from exc
        if self.domain and self.domain[0] >= self.domain[1]:
            raise ValueError("curve domain must be increasing")
        return self


class GraphSegment(_Strict):
    start: Point = Field(alias="from")
    end: Point = Field(alias="to")
    color: Color = "muted"
    label: str | None = None
    dashed: bool = False
    arrow: bool = False


class GraphPoint(_Strict):
    at: Point
    label: str | None = None
    color: Color = "primary"
    open: bool = False  # hollow circle, e.g. a hole in the graph


class GraphBlock(_Strict):
    type: Literal["graph"] = "graph"
    x: Point
    y: Point
    x_label: str = "x"
    y_label: str = "y"
    grid: bool = True
    aspect: float = Field(default=0.62, ge=0.3, le=1.5)  # height / width
    curves: list[GraphCurve] = Field(default_factory=list)
    segments: list[GraphSegment] = Field(default_factory=list)
    points: list[GraphPoint] = Field(default_factory=list)
    caption: str | None = None

    @model_validator(mode="after")
    def _check_ranges(self) -> GraphBlock:
        if self.x[0] >= self.x[1] or self.y[0] >= self.y[1]:
            raise ValueError("graph x and y ranges must be increasing")
        return self


class ImageBlock(_Strict):
    """A diagram or picture stored in app/content/assets/ (SVG or PNG)."""

    type: Literal["image"] = "image"
    src: Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9/_-]*\.(svg|png|jpg|webp)$")]
    alt: Text  # read aloud by screen readers
    aspect: float = Field(default=0.56, ge=0.2, le=2.0)  # height / width
    caption: str | None = None


class TextBlock(_Strict):
    type: Literal["text"] = "text"
    md: Text


class CalloutBlock(_Strict):
    """A highlighted box: the key idea to remember, a tip, or a common mistake."""

    type: Literal["callout"] = "callout"
    tone: Literal["key", "tip", "warning"] = "key"
    title: str | None = None
    md: Text


Block = Annotated[TextBlock | CalloutBlock | GraphBlock | ImageBlock, Field(discriminator="type")]
Figure = Annotated[GraphBlock | ImageBlock, Field(discriminator="type")]


# --- Lesson items -------------------------------------------------------------------------


class TeachCard(_Strict):
    type: Literal["teach"]
    id: Slug
    title: Text
    blocks: list[Block] = Field(min_length=1)


class _QuestionBase(_Strict):
    id: Slug
    prompt: Text
    figure: Figure | None = None  # a graph or diagram shown under the prompt
    hint: str | None = None
    explanation: Text  # shown after every graded attempt, right or wrong


class MultipleChoiceQuestion(_QuestionBase):
    type: Literal["multiple_choice"]
    # Each choice is text, or a graph for "which graph shows...?" questions.
    choices: list[Text | GraphBlock] = Field(min_length=2, max_length=6)
    answer: int  # 0-based index into choices

    @model_validator(mode="after")
    def _check_answer(self) -> MultipleChoiceQuestion:
        if not 0 <= self.answer < len(self.choices):
            raise ValueError(f"answer index {self.answer} is out of range")
        keys = [c if isinstance(c, str) else c.model_dump_json() for c in self.choices]
        if len(set(keys)) != len(keys):
            raise ValueError("choices must be unique")
        return self


class MathInputQuestion(_QuestionBase):
    type: Literal["math_input"]
    answer: Text  # an expression in the same syntax students type, e.g. "1/(2sqrt(x))"
    display_answer: str | None = None  # LaTeX shown to the student, e.g. "$\frac{1}{2\sqrt{x}}$"
    variables: list[str] = Field(default_factory=list)  # [] means the answer is a number
    tolerance: float | None = Field(default=None, gt=0)  # absolute, for rounded answers
    placeholder: str | None = None

    @field_validator("variables")
    @classmethod
    def _check_variables(cls, value: list[str]) -> list[str]:
        validate_variables(value)
        return value

    @model_validator(mode="after")
    def _check_answer_parses(self) -> MathInputQuestion:
        try:
            parse_expression(self.answer, self.variables)
        except ParseError as exc:
            raise ValueError(f"answer {self.answer!r} doesn't parse: {exc}") from exc
        return self


Question = MultipleChoiceQuestion | MathInputQuestion
Item = Annotated[
    TeachCard | MultipleChoiceQuestion | MathInputQuestion, Field(discriminator="type")
]
LessonKind = Literal["learn", "practice", "destroyer"]


class Lesson(_Strict):
    id: Slug
    kind: LessonKind
    topic: str | None = None  # groups Learn → Practice → Destroyer on the course path
    title: Text
    description: str = ""
    xp: int = Field(default=10, ge=1, le=100)
    items: list[Item] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_items(self) -> Lesson:
        _require_unique([item.id for item in self.items], f"item id in lesson {self.id}")
        if not self.questions:
            raise ValueError(f"lesson {self.id} needs at least one question to be graded")
        if self.kind == "learn" and not any(isinstance(i, TeachCard) for i in self.items):
            raise ValueError(f"learn lesson {self.id} needs at least one teaching card")
        return self

    @property
    def questions(self) -> list[Question]:
        return [item for item in self.items if not isinstance(item, TeachCard)]

    @property
    def cards(self) -> list[TeachCard]:
        return [item for item in self.items if isinstance(item, TeachCard)]

    def question(self, question_id: str) -> Question | None:
        return next((q for q in self.questions if q.id == question_id), None)


class Unit(_Strict):
    id: Slug
    title: Text
    description: str = ""
    lessons: list[Lesson] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_lesson_ids(self) -> Unit:
        _require_unique([lesson.id for lesson in self.lessons], f"lesson id in unit {self.id}")
        return self


class Course(_Strict):
    id: Slug
    code: Text  # Ontario course code, e.g. "MCV4U"
    title: Text
    subject: Literal["math", "science", "english", "computer-science"]
    level: Literal["high_school", "university"]
    grade: int | None = Field(default=None, ge=9, le=12)
    description: str = ""
    prerequisites: list[str] = Field(default_factory=list)
    units: list[Unit] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_unit_ids(self) -> Course:
        _require_unique([u.id for u in self.units], f"unit id in course {self.id}")
        return self


def _require_unique(ids: list[str], what: str) -> None:
    seen: set[str] = set()
    for item in ids:
        if item in seen:
            raise ValueError(f"duplicate {what}: {item!r}")
        seen.add(item)


def iter_blocks(lesson: Lesson):
    """Every visual block in a lesson: card blocks, question figures and graph choices."""
    for item in lesson.items:
        if isinstance(item, TeachCard):
            yield from item.blocks
            continue
        if item.figure is not None:
            yield item.figure
        if isinstance(item, MultipleChoiceQuestion):
            yield from (c for c in item.choices if isinstance(c, GraphBlock))
