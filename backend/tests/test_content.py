"""Checks every lesson in the real course content, so bad content can't ship."""

from collections import Counter

import pytest

from app.content.loader import load_catalog
from app.content.models import (
    CalloutBlock,
    GraphBlock,
    MathInputQuestion,
    MultipleChoiceQuestion,
    TeachCard,
    TextBlock,
    iter_blocks,
)
from app.grading import grade_choice, grade_math
from app.schemas import public_graph

catalog = load_catalog()
LESSONS = [pytest.param(ref.lesson, id=ref.lesson.id) for ref in catalog.lessons.values()]
ALL_QUESTIONS = [
    pytest.param(ref.lesson.id, q, id=f"{ref.lesson.id}/{q.id}")
    for ref in catalog.lessons.values()
    for q in ref.lesson.questions
]


def test_catalog_has_mcv4u():
    course = catalog.courses["mcv4u"]
    assert course.code == "MCV4U"
    assert course.units and all(unit.lessons for unit in course.units)


def test_every_topic_goes_learn_practice_destroyer():
    for course in catalog.courses.values():
        for unit in course.units:
            by_topic: dict[str, list[str]] = {}
            for lesson in unit.lessons:
                by_topic.setdefault(lesson.topic or lesson.id, []).append(lesson.kind)
            for topic, kinds in by_topic.items():
                assert kinds == ["learn", "practice", "destroyer"], f"{unit.id} / {topic}: {kinds}"


@pytest.mark.parametrize(("lesson_id", "question"), ALL_QUESTIONS)
def test_answer_key_grades_as_correct(lesson_id, question):
    if isinstance(question, MultipleChoiceQuestion):
        grade = grade_choice(question.answer, question.answer, len(question.choices))
    else:
        assert isinstance(question, MathInputQuestion)
        grade = grade_math(question.answer, question.answer, question.variables, question.tolerance)
    assert grade.status == "correct"


def _texts(lesson):
    for item in lesson.items:
        if isinstance(item, TeachCard):
            yield item.title
        else:
            yield from (item.prompt, item.explanation, item.hint or "")
            if isinstance(item, MultipleChoiceQuestion):
                yield from (c for c in item.choices if isinstance(c, str))
    for block in iter_blocks(lesson):
        if isinstance(block, TextBlock | CalloutBlock):
            yield block.md
        caption = getattr(block, "caption", None)
        if caption:
            yield caption


@pytest.mark.parametrize("lesson", LESSONS)
def test_math_in_text_is_balanced(lesson):
    """Every $...$ needs a closing $, or KaTeX shows raw LaTeX to the student."""
    for text in _texts(lesson):
        assert text.replace("$$", "").count("$") % 2 == 0, text


@pytest.mark.parametrize("lesson", LESSONS)
def test_every_graph_curve_is_visible(lesson):
    """A curve that never appears inside the graph's window is a content bug."""
    for block in iter_blocks(lesson):
        if isinstance(block, GraphBlock):
            for curve in public_graph(block).curves:
                assert curve.paths, f"{lesson.id}: nothing to draw in {block}"


@pytest.mark.parametrize("lesson", LESSONS)
def test_multiple_choice_answers_are_not_predictable(lesson):
    """Students shouldn't learn that 'the answer is always A'."""
    answers = Counter(q.answer for q in lesson.questions if isinstance(q, MultipleChoiceQuestion))
    total = sum(answers.values())
    if total >= 3:
        assert max(answers.values()) < total, f"{lesson.id}: every answer is option {answers}"


def test_catalog_matches_the_website_subjects():
    """All 15 subjects from the Quantic website, in the website's order."""
    ids = list(catalog.courses)
    assert len(ids) == 15
    assert ids[:6] == [
        "math-foundations",
        "science-foundations",
        "english-foundations",
        "mcr3u",
        "mhf4u",
        "mcv4u",
    ]
    for course in catalog.courses.values():
        lessons = [lesson for unit in course.units for lesson in unit.lessons]
        if course.status == "coming_soon":
            assert not lessons, f"{course.id} is 'coming soon' but has lessons"
        else:
            assert lessons, f"{course.id} is available but has no lessons"
