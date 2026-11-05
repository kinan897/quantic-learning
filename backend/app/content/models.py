"""Content schema: Course → Unit → Lesson → Question.

Content lives in YAML files under ``app/content/<course>/``. It's validated against these
models when the app starts, so a typo in a question fails fast instead of reaching students.

Text fields (prompts, choices, hints, explanations) are Markdown with LaTeX math between
``$...$``. The app renders them with KaTeX.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.grading.parser import ParseError, parse_expression, validate_variables

Slug = Annotated[str, Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=60)]
Text = Annotated[str, Field(min_length=1)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class _QuestionBase(_Strict):
    id: Slug
    prompt: Text
    hint: str | None = None
    explanation: Text  # shown after every graded attempt, right or wrong


class MultipleChoiceQuestion(_QuestionBase):
    type: Literal["multiple_choice"]
    choices: list[Text] = Field(min_length=2, max_length=6)
    answer: int  # 0-based index into choices

    @model_validator(mode="after")
    def _check_answer(self) -> MultipleChoiceQuestion:
        if not 0 <= self.answer < len(self.choices):
            raise ValueError(f"answer index {self.answer} is out of range")
        if len(set(self.choices)) != len(self.choices):
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


Question = Annotated[MultipleChoiceQuestion | MathInputQuestion, Field(discriminator="type")]


class Lesson(_Strict):
    id: Slug
    title: Text
    description: str = ""
    xp: int = Field(default=10, ge=1, le=100)
    questions: list[Question] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_question_ids(self) -> Lesson:
        _require_unique([q.id for q in self.questions], f"question id in lesson {self.id}")
        return self

    def question(self, question_id: str) -> MultipleChoiceQuestion | MathInputQuestion | None:
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
