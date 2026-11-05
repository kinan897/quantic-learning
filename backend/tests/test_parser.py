import pytest
import sympy as sp

from app.grading.parser import ParseError, parse_expression

x, h = sp.symbols("x h")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("2x", 2 * x),
        ("3x^2 - 2sin(x)", 3 * x**2 - 2 * sp.sin(x)),
        ("3x**2", 3 * x**2),
        ("2(x+1)", 2 * (x + 1)),
        ("(x+1)(x-1)", (x + 1) * (x - 1)),
        ("-x^2", -(x**2)),
        ("2^3^2", sp.Integer(512)),  # right-associative: 2^(3^2)
        ("sin^2 x", sp.sin(x) ** 2),
        ("sin^2(x)", sp.sin(x) ** 2),
        ("sin^-1(x)", sp.asin(x)),
        ("sinx cosx", sp.sin(x) * sp.cos(x)),
        ("sin 2x", sp.sin(2 * x)),
        ("ln x", sp.log(x)),
        ("log(100)", sp.Integer(2)),  # log means base 10
        ("e^x", sp.exp(x)),
        ("pi/2", sp.pi / 2),
        ("π/2", sp.pi / 2),
        ("√x", sp.sqrt(x)),
        ("x²", x**2),
        ("1/(2sqrt(x))", 1 / (2 * sp.sqrt(x))),
        ("|x| + 1", sp.Abs(x) + 1),
        ("2|x|", 2 * sp.Abs(x)),
        ("[x+1]", x + 1),
        ("0.25", sp.Rational(1, 4)),
        ("y = 5x - 8", 5 * x - 8),
        ("f'(x) = 2x", 2 * x),
        ("  SIN(X)  ", sp.sin(x)),
    ],
)
def test_parses(text, expected):
    assert sp.simplify(parse_expression(text, ["x"]) - expected) == 0


def test_multiple_variables():
    assert parse_expression("6 + h", ["h"]) == 6 + h


@pytest.mark.parametrize(
    "text",
    [
        "",
        "   ",
        "x+",
        "(x",
        "x)",
        "()",
        "sin",
        "sin()",
        "|x",
        "x = y = 2",
        "2 * * 3",
        # Unknown letters / disallowed characters
        "q",
        "x.real",
        "x;y",
        "__import__('os').system('echo hi')",
        "lambda: 1",
        # Resource exhaustion
        "9^9^9",
        "2^100000",
        "2**3**4**5",
        "x^99999999",
        "1234567890123456789",
        "(" * 40 + "x" + ")" * 40,
        "-" * 40 + "x",
        "x+" * 150 + "x",
    ],
)
def test_rejects(text):
    with pytest.raises(ParseError):
        parse_expression(text, ["x"])


def test_number_only_question_rejects_variables():
    with pytest.raises(ParseError, match="should be a number"):
        parse_expression("x + 1", [])


@pytest.mark.parametrize("bad", [["e"], ["xy"], ["X"], ["x", "x"], ["1"]])
def test_invalid_variable_declarations(bad):
    with pytest.raises(ValueError):
        parse_expression("1", bad)
