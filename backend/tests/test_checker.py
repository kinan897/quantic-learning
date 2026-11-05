import pytest

from app.grading import grade_choice, grade_math


@pytest.mark.parametrize(
    ("student", "expected"),
    [
        ("2x+2", "2(x+1)"),
        ("x+x+2", "2(x+1)"),
        ("(x^2-1)/(x-1)", "x+1"),  # removable discontinuity is fine
        ("0.5x^(-1/2)", "1/(2sqrt(x))"),
        ("x^(-2) * -1", "-1/x^2"),
        ("1 - cos^2 x", "sin^2 x"),
        ("2sin(x)cos(x)", "sin(2x)"),
        ("ln(x^2)", "2ln(x)"),
        ("e^(2ln x)", "x^2"),
        ("y = 5x - 8", "5x - 8"),
    ],
)
def test_equivalent_expressions_are_correct(student, expected):
    assert grade_math(student, expected, ["x"]).status == "correct"


@pytest.mark.parametrize(
    ("student", "expected"),
    [
        ("2x+3", "2(x+1)"),
        ("x^2", "2x"),
        ("1/(2x)", "1/(2sqrt(x))"),
        ("sin(x)", "cos(x)"),
        ("x + 1.0001", "x + 1"),
    ],
)
def test_different_expressions_are_incorrect(student, expected):
    assert grade_math(student, expected, ["x"]).status == "incorrect"


@pytest.mark.parametrize("student", ["0.25", "1/4", "2/8", "(1/2)^2", "sqrt(1/16)"])
def test_numeric_answers(student):
    assert grade_math(student, "1/4").status == "correct"


def test_numeric_wrong():
    assert grade_math("0.24", "1/4").status == "incorrect"


def test_tolerance_for_rounded_answers():
    assert grade_math("3.14", "pi", tolerance=0.005).status == "correct"
    assert grade_math("3.15", "pi", tolerance=0.005).status == "incorrect"
    # Without a tolerance, the answer has to be exact.
    assert grade_math("3.14", "pi").status == "incorrect"


def test_undefined_answer_is_incorrect():
    assert grade_math("1/0", "5").status == "incorrect"


def test_invalid_input_explains_itself():
    grade = grade_math("2x+", "2x", ["x"])
    assert grade.status == "invalid"
    assert grade.message


def test_grade_choice():
    assert grade_choice(1, 1, 4).status == "correct"
    assert grade_choice("1", 1, 4).status == "correct"
    assert grade_choice(0, 1, 4).status == "incorrect"
    assert grade_choice(7, 1, 4).status == "invalid"
    assert grade_choice("abc", 1, 4).status == "invalid"
    assert grade_choice(True, 1, 4).status == "invalid"
