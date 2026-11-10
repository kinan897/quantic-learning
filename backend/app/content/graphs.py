"""Turn graph descriptions from course content into points the app can draw.

Content authors write curves as formulas (``x^2 - 4x + 5``). The server samples them once
into polylines, so every app (iOS, Android, web) draws the exact same picture without its
own math parser. Curves are split where the function is undefined or jumps (asymptotes),
so the drawing never connects across a gap.
"""

from __future__ import annotations

import math
from functools import lru_cache

import sympy as sp

from app.grading.parser import parse_expression

SAMPLES = 240

Polyline = list[tuple[float, float]]


@lru_cache(maxsize=1024)
def sample_curve(
    expr: str, x_min: float, x_max: float, y_min: float, y_max: float
) -> list[Polyline]:
    x = sp.Symbol("x")
    # lambdify compiles the expression to plain Python. Safe: expressions come only from
    # our own course files and pass through the same parser students' answers do.
    f = sp.lambdify(x, parse_expression(expr, ["x"]), modules=["math"])
    span = y_max - y_min
    margin = 2 * span  # keep a little beyond the visible area so lines exit the frame cleanly

    paths: list[Polyline] = []
    current: Polyline = []
    for i in range(SAMPLES + 1):
        xv = x_min + (x_max - x_min) * i / SAMPLES
        try:
            yv = float(f(xv))
        except (ArithmeticError, ValueError, TypeError):
            yv = math.nan
        out_of_frame = not math.isfinite(yv) or not (y_min - margin <= yv <= y_max + margin)
        jumped = bool(current) and abs(yv - current[-1][1]) > span
        if out_of_frame or jumped:
            if len(current) > 1:
                paths.append(current)
            current = [] if out_of_frame else [(round(xv, 4), round(yv, 4))]
            continue
        current.append((round(xv, 4), round(yv, 4)))
    if len(current) > 1:
        paths.append(current)
    return paths
