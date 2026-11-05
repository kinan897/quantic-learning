"""Checks every question in the real course content, so bad content can't ship."""

import pytest

from app.content.loader import load_catalog
from app.content.models import MathInputQuestion, MultipleChoiceQuestion
from app.grading import grade_choice, grade_math

catalog = load_catalog()
ALL_QUESTIONS = [
    pytest.param(ref.lesson.id, q, id=f"{ref.lesson.id}/{q.id}")
    for ref in catalog.lessons.values()
    for q in ref.lesson.questions
]


def test_catalog_has_mcv4u():
    course = catalog.courses["mcv4u"]
    assert course.code == "MCV4U"
    assert course.units and all(unit.lessons for unit in course.units)


@pytest.mark.parametrize(("lesson_id", "question"), ALL_QUESTIONS)
def test_answer_key_grades_as_correct(lesson_id, question):
    if isinstance(question, MultipleChoiceQuestion):
        grade = grade_choice(question.answer, question.answer, len(question.choices))
    else:
        assert isinstance(question, MathInputQuestion)
        grade = grade_math(question.answer, question.answer, question.variables, question.tolerance)
    assert grade.status == "correct"


@pytest.mark.parametrize(("lesson_id", "question"), ALL_QUESTIONS)
def test_math_in_text_is_balanced(lesson_id, question):
    """Every $...$ needs a closing $, or KaTeX shows raw LaTeX to the student."""
    texts = [question.prompt, question.explanation, question.hint or ""]
    if isinstance(question, MultipleChoiceQuestion):
        texts += question.choices
    for text in texts:
        assert text.replace("$$", "").count("$") % 2 == 0, text
