"""Content and grading endpoints."""

import pytest

from tests.conftest import bearer

LESSON = "mcv4u-u1-l1"  # q1 multiple choice (answer 0), q2 math input "19"


@pytest.fixture
def headers(guest) -> dict:
    return bearer(guest)


def check(client, headers, question_id, answer, lesson=LESSON):
    return client.post(
        f"/api/v1/lessons/{lesson}/questions/{question_id}/check",
        json={"answer": answer},
        headers=headers,
    )


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_list_courses_is_public(client):
    courses = client.get("/api/v1/courses").json()
    mcv4u = next(c for c in courses if c["id"] == "mcv4u")
    assert mcv4u["code"] == "MCV4U"
    assert mcv4u["lesson_count"] >= 3


def test_course_detail(client):
    course = client.get("/api/v1/courses/mcv4u").json()
    lesson_ids = [lesson["id"] for unit in course["units"] for lesson in unit["lessons"]]
    assert LESSON in lesson_ids


def test_unknown_course_is_404(client):
    assert client.get("/api/v1/courses/nope").status_code == 404


def test_lessons_require_sign_in(client):
    assert client.get(f"/api/v1/lessons/{LESSON}").status_code == 401
    assert check(client, {}, "q1", 0).status_code == 401


def test_lesson_never_leaks_answers(client, headers):
    lesson = client.get(f"/api/v1/lessons/{LESSON}", headers=headers).json()
    assert lesson["questions"]
    for question in lesson["questions"]:
        for secret in ("answer", "explanation", "display_answer", "tolerance"):
            assert secret not in question


def test_multiple_choice_correct(client, headers):
    body = check(client, headers, "q1", 0).json()
    assert body["result"] == "correct"
    assert body["correct_choice"] == 0
    assert body["explanation"]


def test_multiple_choice_incorrect_reveals_answer(client, headers):
    body = check(client, headers, "q1", 2).json()
    assert body["result"] == "incorrect"
    assert body["correct_choice"] == 0


def test_math_input_accepts_equivalent_form(client, headers):
    assert check(client, headers, "q2", "57/3").json()["result"] == "correct"


def test_math_input_incorrect(client, headers):
    body = check(client, headers, "q2", "18").json()
    assert body["result"] == "incorrect"
    assert body["correct_answer"] == "19"


def test_math_input_invalid_gives_message_without_answer(client, headers):
    body = check(client, headers, "q2", "57/").json()
    assert body["result"] == "invalid"
    assert body["message"]
    assert body["correct_answer"] is None
    assert body["explanation"] is None


def test_unknown_question_is_404(client, headers):
    assert check(client, headers, "q999", "1").status_code == 404
    assert check(client, headers, "q1", "1", lesson="nope").status_code == 404
