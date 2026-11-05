"""Safe parser for typed math answers.

Students type things like ``3x^2 - 2sin(x)``, ``(x+1)/(x-1)``, ``sin^2 x`` or ``y = 5x - 8``.
This module tokenizes the input and parses it with a small recursive-descent parser that
builds SymPy expressions directly.

Why not ``sympy.sympify`` / ``parse_expr``? Both call Python's ``eval`` and the SymPy docs
warn against using them on untrusted input. Here the student's text is never executed.
Only the grammar below is accepted, and numeric power towers such as ``9^9^9`` are rejected
before SymPy tries to compute them.

Grammar (lowest to highest precedence)::

    expr    := term (('+' | '-') term)*
    term    := unary (('*' | '/') unary | <implicit> power)*     # 2x, x(x+1), 3sin(x)
    unary   := ('-' | '+') unary | power
    power   := primary ('^' unary)?                              # right-associative
    primary := number | constant | variable | function
             | '(' expr ')' | '|' expr '|'
    function:= name ('^' unary)? ( '(' expr ')' | bare_argument )  # sin(x), sin x, sin^2 x
"""

from __future__ import annotations

import math
import re
from collections.abc import Callable, Iterable
from dataclasses import dataclass

import sympy as sp

MAX_INPUT_LENGTH = 200
MAX_NUMBER_DIGITS = 15
MAX_NESTING = 30
# Largest number of decimal digits a purely numeric power may produce (e.g. 10^1000).
MAX_MAGNITUDE_DIGITS = 1000
MAX_SYMBOLIC_EXPONENT = 10_000


class ParseError(ValueError):
    """The input isn't a valid expression. The message is written for students."""


def _log10(arg: sp.Expr) -> sp.Expr:
    # Ontario convention: "log" means base 10, "ln" means base e.
    return sp.log(arg, 10)


FUNCTIONS: dict[str, Callable[[sp.Expr], sp.Expr]] = {
    "arcsin": sp.asin,
    "arccos": sp.acos,
    "arctan": sp.atan,
    "sinh": sp.sinh,
    "cosh": sp.cosh,
    "tanh": sp.tanh,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "sec": sp.sec,
    "csc": sp.csc,
    "cot": sp.cot,
    "sqrt": sp.sqrt,
    "ln": sp.log,
    "log": _log10,
    "exp": sp.exp,
    "abs": sp.Abs,
}

# sin^-1(x) is the usual way students write arcsin(x).
INVERSE_TRIG: dict[str, Callable[[sp.Expr], sp.Expr]] = {
    "sin": sp.asin,
    "cos": sp.acos,
    "tan": sp.atan,
}

CONSTANTS: dict[str, sp.Expr] = {"pi": sp.pi, "e": sp.E}

RESERVED_NAMES = frozenset(FUNCTIONS) | frozenset(CONSTANTS)

# Characters phones and math keyboards commonly produce, mapped to plain ASCII.
_REPLACEMENTS = (
    ("**", "^"),
    ("π", "pi"),
    ("√", "sqrt"),
    ("×", "*"),
    ("·", "*"),
    ("⋅", "*"),
    ("÷", "/"),
    ("−", "-"),
    ("–", "-"),
    ("²", "^2"),
    ("³", "^3"),
    ("[", "("),
    ("]", ")"),
    ("{", "("),
    ("}", ")"),
)

_NUMBER = re.compile(r"\d+\.?\d*|\.\d+")
_OPERATORS = frozenset("+-*/^()|")


@dataclass(frozen=True)
class Token:
    kind: str  # "num" | "var" | "const" | "func" | "op" | "end"
    text: str
    pos: int


def parse_expression(text: str, variables: Iterable[str] = ()) -> sp.Expr:
    """Parse ``text`` into a SymPy expression.

    ``variables`` lists the single-letter variables the answer may use (e.g. ``["x"]``).
    Any other letter is rejected with a helpful message.
    """
    if not isinstance(text, str):
        raise ParseError("Your answer must be text.")
    variables = tuple(variables)
    validate_variables(variables)

    text = _normalize(text)
    if len(text) > MAX_INPUT_LENGTH:
        raise ParseError("That answer is too long.")

    tokens = _tokenize(text, variables)
    symbols = {name: sp.Symbol(name) for name in variables}
    try:
        return _Parser(tokens, symbols, variables).parse()
    except RecursionError:  # pragma: no cover - guarded by MAX_NESTING
        raise ParseError("Your answer has too many nested brackets.") from None


def validate_variables(variables: Iterable[str]) -> None:
    """Raise ``ValueError`` if a question declares a variable the parser can't support."""
    seen: set[str] = set()
    for name in variables:
        if not (len(name) == 1 and name.isascii() and name.islower() and name.isalpha()):
            raise ValueError(f"Variable {name!r} must be a single lowercase letter.")
        if name == "e":
            raise ValueError("'e' is reserved for Euler's number and can't be a variable.")
        if name in seen:
            raise ValueError(f"Variable {name!r} is listed twice.")
        seen.add(name)


def _normalize(text: str) -> str:
    for old, new in _REPLACEMENTS:
        text = text.replace(old, new)
    text = text.strip().lower()

    # Accept "y = 5x - 8" or "f'(x) = 2x" by keeping only the right-hand side.
    if text.count("=") == 1:
        left, right = text.split("=")
        if len(left.strip()) > 12:
            raise ParseError("Enter just the answer, without an equation.")
        text = right.strip()
    elif "=" in text:
        raise ParseError("Enter just one expression.")
    return text


def _tokenize(text: str, variables: tuple[str, ...]) -> list[Token]:
    # Longest names first, so "sinh" wins over "sin" and "pi" over a variable "p".
    vocabulary = sorted({*FUNCTIONS, *CONSTANTS, *variables}, key=len, reverse=True)
    tokens: list[Token] = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch.isspace():
            i += 1
        elif ch.isdigit() or ch == ".":
            match = _NUMBER.match(text, i)
            if not match:
                raise ParseError("There's a stray '.' in your answer.")
            if sum(c.isdigit() for c in match.group()) > MAX_NUMBER_DIGITS:
                raise ParseError("One of the numbers in your answer is too long.")
            tokens.append(Token("num", match.group(), i))
            i = match.end()
        elif ch.isascii() and ch.isalpha():
            j = i
            while j < len(text) and text[j].isascii() and text[j].isalpha():
                j += 1
            tokens.extend(_split_word(text[i:j], i, vocabulary, variables))
            i = j
        elif ch in _OPERATORS:
            tokens.append(Token("op", ch, i))
            i += 1
        else:
            raise ParseError(f"I don't understand the character '{ch}'.")
    tokens.append(Token("end", "", len(text)))
    return tokens


def _split_word(
    word: str, start: int, vocabulary: list[str], variables: tuple[str, ...]
) -> list[Token]:
    """Split a run of letters such as ``xsinx`` into ``x``, ``sin``, ``x``."""
    out: list[Token] = []
    k = 0
    while k < len(word):
        for name in vocabulary:
            if word.startswith(name, k):
                if name in FUNCTIONS:
                    kind = "func"
                elif name in CONSTANTS:
                    kind = "const"
                else:
                    kind = "var"
                out.append(Token(kind, name, start + k))
                k += len(name)
                break
        else:
            raise ParseError(_unknown_letter_message(word[k], variables))
    return out


def _unknown_letter_message(letter: str, variables: tuple[str, ...]) -> str:
    if not variables:
        return f"I don't recognise '{letter}'. This answer should be a number."
    if len(variables) == 1:
        return f"I don't recognise '{letter}'. Use the variable {variables[0]}."
    return f"I don't recognise '{letter}'. Use the variables {', '.join(variables)}."


def _safe_pow(base: sp.Expr, exponent: sp.Expr) -> sp.Expr:
    """Build ``base**exponent``, refusing results too large to compute quickly."""
    if exponent.is_number:
        try:
            exp_size = float(sp.Abs(exponent))
            base_size = float(sp.Abs(base)) if base.is_number else None
        except (TypeError, ValueError, OverflowError):
            raise ParseError("That number is too large to work with.") from None
        if base_size is not None:
            if base_size not in (0.0, 1.0) and math.isfinite(base_size):
                if exp_size * abs(math.log10(base_size)) > MAX_MAGNITUDE_DIGITS:
                    raise ParseError("That number is too large to work with.")
        elif exp_size > MAX_SYMBOLIC_EXPONENT:
            raise ParseError("That exponent is too large.")
    return sp.Pow(base, exponent)


class _Parser:
    def __init__(
        self, tokens: list[Token], symbols: dict[str, sp.Symbol], variables: tuple[str, ...]
    ):
        self.tokens = tokens
        self.symbols = symbols
        self.variables = variables
        self.i = 0
        self.depth = 0
        self.inside_abs = False

    # -- token helpers -------------------------------------------------------------------

    @property
    def tok(self) -> Token:
        return self.tokens[self.i]

    def _advance(self) -> Token:
        token = self.tokens[self.i]
        self.i += 1
        return token

    def _is_op(self, ch: str) -> bool:
        return self.tok.kind == "op" and self.tok.text == ch

    def _expect(self, ch: str) -> None:
        if not self._is_op(ch):
            if ch == ")":
                raise ParseError("You're missing a closing bracket ')'.")
            if ch == "|":
                raise ParseError("You're missing a closing '|'.")
            raise ParseError(self._unexpected())
        self._advance()

    def _unexpected(self) -> str:
        token = self.tok
        if token.kind == "end":
            return "Your answer looks unfinished. Check for a missing number or bracket."
        if token.text == ")":
            return "There's an extra ')' in your answer."
        return f"I didn't expect '{token.text}' there."

    def _starts_primary(self) -> bool:
        token = self.tok
        if token.kind in ("num", "var", "const", "func"):
            return True
        if token.kind == "op":
            return token.text == "(" or (token.text == "|" and not self.inside_abs)
        return False

    def _enter(self) -> None:
        self.depth += 1
        if self.depth > MAX_NESTING:
            raise ParseError("Your answer has too many nested brackets.")

    # -- grammar -------------------------------------------------------------------------

    def parse(self) -> sp.Expr:
        if self.tok.kind == "end":
            raise ParseError("Please enter an answer.")
        result = self.expr()
        if self.tok.kind != "end":
            raise ParseError(self._unexpected())
        return result

    def expr(self) -> sp.Expr:
        left = self.term()
        while self._is_op("+") or self._is_op("-"):
            op = self._advance().text
            right = self.term()
            left = left + right if op == "+" else left - right
        return left

    def term(self) -> sp.Expr:
        left = self.unary()
        while True:
            if self._is_op("*"):
                self._advance()
                left = left * self.unary()
            elif self._is_op("/"):
                self._advance()
                left = left / self.unary()
            elif self._starts_primary():  # implicit multiplication: 2x, x(x+1)
                left = left * self.power()
            else:
                return left

    def unary(self) -> sp.Expr:
        if self._is_op("-"):
            self._advance()
            self._enter()
            value = -self.unary()
            self.depth -= 1
            return value
        if self._is_op("+"):
            self._advance()
            return self.unary()
        return self.power()

    def power(self) -> sp.Expr:
        base = self.primary()
        if self._is_op("^"):
            self._advance()
            self._enter()
            exponent = self.unary()
            self.depth -= 1
            return _safe_pow(base, exponent)
        return base

    def primary(self) -> sp.Expr:
        token = self.tok
        if token.kind == "num":
            self._advance()
            return sp.Rational(token.text)
        if token.kind == "const":
            self._advance()
            return CONSTANTS[token.text]
        if token.kind == "var":
            self._advance()
            return self.symbols[token.text]
        if token.kind == "func":
            return self.function()
        if self._is_op("("):
            self._advance()
            self._enter()
            if self._is_op(")"):
                raise ParseError("There's an empty pair of brackets '()' in your answer.")
            was_inside_abs, self.inside_abs = self.inside_abs, False
            inner = self.expr()
            self.inside_abs = was_inside_abs
            self._expect(")")
            self.depth -= 1
            return inner
        if self._is_op("|") and not self.inside_abs:
            self._advance()
            self._enter()
            self.inside_abs = True
            inner = self.expr()
            self.inside_abs = False
            self._expect("|")
            self.depth -= 1
            return sp.Abs(inner)
        raise ParseError(self._unexpected())

    def function(self) -> sp.Expr:
        name = self._advance().text
        self._enter()

        exponent = None
        if self._is_op("^"):  # sin^2(x), sin^-1(x)
            self._advance()
            exponent = self.unary()

        if self._is_op("("):
            self._advance()
            if self._is_op(")"):
                raise ParseError(f"'{name}()' is empty. Put something inside the brackets.")
            was_inside_abs, self.inside_abs = self.inside_abs, False
            argument = self.expr()
            self.inside_abs = was_inside_abs
            self._expect(")")
        elif self._starts_primary():
            argument = self.bare_argument()
        else:
            raise ParseError(f"'{name}' needs something to act on, like {name}(x).")
        self.depth -= 1

        if exponent is not None and exponent == -1 and name in INVERSE_TRIG:
            return INVERSE_TRIG[name](argument)
        value = FUNCTIONS[name](argument)
        return _safe_pow(value, exponent) if exponent is not None else value

    def bare_argument(self) -> sp.Expr:
        """Argument written without brackets: ``sin x``, ``sin 2x``, ``ln x^2``.

        It runs until the next operator or function, so ``sinx cosx`` is sin(x)·cos(x).
        """
        argument = self.power()
        while self.tok.kind in ("num", "var", "const"):
            argument = argument * self.power()
        return argument
