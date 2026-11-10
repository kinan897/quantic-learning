import pytest
from pydantic import ValidationError

from app.content.graphs import SAMPLES, sample_curve
from app.content.models import GraphBlock, Lesson


def test_smooth_curve_is_one_path_covering_the_range():
    paths = sample_curve("x^2", -2.0, 2.0, -1.0, 5.0)
    assert len(paths) == 1
    xs = [x for x, _ in paths[0]]
    assert xs[0] == -2 and xs[-1] == 2 and len(xs) == SAMPLES + 1


def test_asymptote_splits_the_curve():
    # 1/x jumps from -inf to +inf at 0: the two halves must not be joined.
    paths = sample_curve("1/x", -3.0, 3.0, -5.0, 5.0)
    assert len(paths) == 2
    assert all(x < 0 for x, _ in paths[0]) and all(x > 0 for x, _ in paths[1])


def test_undefined_region_is_left_out():
    paths = sample_curve("sqrt(x)", -2.0, 4.0, 0.0, 3.0)
    assert len(paths) == 1
    assert min(x for x, _ in paths[0]) >= 0


def test_values_far_off_screen_are_dropped():
    paths = sample_curve("1/x^2", -1.0, 1.0, 0.0, 10.0)
    for path in paths:
        assert all(y <= 10 + 2 * 10 for _, y in path)


def test_graph_rejects_bad_formulas_and_ranges():
    with pytest.raises(ValidationError):
        GraphBlock(x=(0, 1), y=(0, 1), curves=[{"expr": "x +"}])
    with pytest.raises(ValidationError):
        GraphBlock(x=(1, 0), y=(0, 1))


def test_learn_lessons_need_a_teaching_card():
    with pytest.raises(ValidationError, match="teaching card"):
        Lesson(
            id="l",
            kind="learn",
            title="t",
            items=[
                {
                    "type": "math_input",
                    "id": "q",
                    "prompt": "p",
                    "explanation": "e",
                    "answer": "1",
                }
            ],
        )


def test_lessons_need_a_graded_question():
    with pytest.raises(ValidationError, match="at least one question"):
        Lesson(
            id="l",
            kind="learn",
            title="t",
            items=[
                {"type": "teach", "id": "c", "title": "c", "blocks": [{"type": "text", "md": "x"}]}
            ],
        )
