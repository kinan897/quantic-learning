"""Decide whether a student's answer is correct.

Math answers are compared by *numeric sampling*. Both expressions are evaluated at several
pseudo-random points, and they're equivalent if they agree at every point where both are
defined. That accepts any algebraically equivalent form (``2(x+1)``, ``2x+2``, ``x+x+2``).
It's also fast and predictable, unlike ``sympy.simplify``, which can take seconds on some
inputs.

Points where one side is undefined are skipped. So ``(x^2-1)/(x-1)`` matches ``x+1``, which
is what a teacher expects when the question asks to simplify.
"""

from __future__ import annotations

import logging
import math
import random
from collections.abc import Sequence
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

import sympy as sp

from .parser import ParseError, parse_expression

logger = logging.getLogger(__name__)

Status = Literal["correct", "incorrect", "invalid"]

SAMPLE_POINTS = 10
MIN_COMPARABLE_POINTS = 4
EVAL_PRECISION = 30
DEFAULT_REL_TOL = 1e-9
DEFAULT_ABS_TOL = 1e-9
_SEED = 1729


@dataclass(frozen=True)
class Grade:
    status: Status
    # Only set when status == "invalid": tells the student what to fix (not a penalty).
    message: str | None = None


def grade_math(
    student_answer: str,
    expected_answer: str,
    variables: Sequence[str] = (),
    tolerance: float | None = None,
) -> Grade:
    """Grade a typed math answer.

    ``tolerance`` is an absolute tolerance for questions that ask for a rounded answer,
    e.g. ``0.005`` for "round to two decimal places". Without it, answers must be exact.
    """
    variables = tuple(variables)
    try:
        student = parse_expression(student_answer, variables)
    except ParseError as exc:
        return Grade("invalid", str(exc))

    expected = _parse_expected(expected_answer, variables)
    if tolerance is None:
        rel_tol, abs_tol = DEFAULT_REL_TOL, DEFAULT_ABS_TOL
    else:
        rel_tol, abs_tol = 0.0, tolerance

    try:
        same = expressions_equivalent(student, expected, variables, rel_tol, abs_tol)
    except Exception:  # SymPy can raise on exotic input. Never 500 on a student answer.
        logger.exception("Failed to compare %r with %r", student_answer, expected_answer)
        return Grade("invalid", "I couldn't check that answer. Try writing it another way.")
    return Grade("correct" if same else "incorrect")


def grade_choice(student_answer: object, correct_index: int, num_choices: int) -> Grade:
    """Grade a multiple-choice answer given as a 0-based choice index."""
    if isinstance(student_answer, bool):
        return Grade("invalid", "Pick one of the choices.")
    try:
        index = int(student_answer)  # type: ignore[call-overload]
    except (TypeError, ValueError):
        return Grade("invalid", "Pick one of the choices.")
    if not 0 <= index < num_choices:
        return Grade("invalid", "Pick one of the choices.")
    return Grade("correct" if index == correct_index else "incorrect")


def expressions_equivalent(
    a: sp.Expr,
    b: sp.Expr,
    variables: Sequence[str] = (),
    rel_tol: float = DEFAULT_REL_TOL,
    abs_tol: float = DEFAULT_ABS_TOL,
) -> bool:
    if not variables:
        va, vb = _evaluate(a, {}), _evaluate(b, {})
        return va is not None and vb is not None and _close(va, vb, rel_tol, abs_tol)

    symbols = [sp.Symbol(name) for name in variables]
    rng = random.Random(_SEED)
    real_pairs: list[tuple[complex, complex]] = []
    complex_pairs: list[tuple[complex, complex]] = []
    for _ in range(SAMPLE_POINTS * 4):
        point = {s: sp.Float(rng.choice((-1, 1)) * rng.uniform(0.2, 3.5), 20) for s in symbols}
        va, vb = _evaluate(a, point), _evaluate(b, point)
        if va is None or vb is None:
            continue
        (real_pairs if _is_real(va) and _is_real(vb) else complex_pairs).append((va, vb))
        if len(real_pairs) >= SAMPLE_POINTS:
            break

    # Students work over the real numbers, so compare where both sides are real. Then
    # ln(x^2) matches 2ln(x) on the domain where 2ln(x) exists. Fall back to complex values
    # only when there aren't enough real points to decide.
    pairs = real_pairs if len(real_pairs) >= MIN_COMPARABLE_POINTS else real_pairs + complex_pairs
    if len(pairs) < MIN_COMPARABLE_POINTS:
        return False
    return all(_close(va, vb, rel_tol, abs_tol) for va, vb in pairs)


@lru_cache(maxsize=4096)
def _parse_expected(answer: str, variables: tuple[str, ...]) -> sp.Expr:
    return parse_expression(answer, variables)


def _evaluate(expr: sp.Expr, point: dict[sp.Symbol, sp.Float]) -> complex | None:
    """Evaluate numerically. Returns ``None`` where the expression is undefined."""
    try:
        value = complex(expr.evalf(EVAL_PRECISION, subs=point))
    except (TypeError, ValueError, ZeroDivisionError, OverflowError):
        return None
    if not (math.isfinite(value.real) and math.isfinite(value.imag)):
        return None
    return value


def _is_real(value: complex) -> bool:
    return abs(value.imag) <= 1e-12 * max(1.0, abs(value.real))


def _close(a: complex, b: complex, rel_tol: float, abs_tol: float) -> bool:
    return abs(a - b) <= max(rel_tol * max(abs(a), abs(b)), abs_tol)
