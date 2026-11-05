import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


LESSON = "mcv4u-u1-l3"  # first principles: q1 multiple choice, q2 math input "2x + 5"


def check(client, question_id, answer, lesson=LESSON):
    return client.post(
        f"/api/v1/lessons/{lesson}/questions/{question_id}/check", json={"answer": answer}
    )


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_list_courses(client):
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


def test_lesson_never_leaks_answers(client):
    lesson = client.get(f"/api/v1/lessons/{LESSON}").json()
    assert lesson["questions"]
    for question in lesson["questions"]:
        for secret in ("answer", "explanation", "display_answer", "tolerance"):
            assert secret not in question


def test_multiple_choice_correct(client):
    body = check(client, "q1", 0).json()
    assert body["result"] == "correct"
    assert body["correct_choice"] == 0
    assert body["explanation"]


def test_multiple_choice_incorrect_reveals_answer(client):
    body = check(client, "q1", 2).json()
    assert body["result"] == "incorrect"
    assert body["correct_choice"] == 0


def test_math_input_accepts_equivalent_form(client):
    assert check(client, "q2", "5 + 2x").json()["result"] == "correct"


def test_math_input_incorrect(client):
    body = check(client, "q2", "2x").json()
    assert body["result"] == "incorrect"
    assert body["correct_answer"] == "$2x + 5$"


def test_math_input_invalid_gives_message_without_answer(client):
    body = check(client, "q2", "2x +").json()
    assert body["result"] == "invalid"
    assert body["message"]
    assert body["correct_answer"] is None
    assert body["explanation"] is None


def test_unknown_question_is_404(client):
    assert check(client, "q999", "1").status_code == 404
    assert check(client, "q1", "1", lesson="nope").status_code == 404
