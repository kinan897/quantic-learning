"""Content and grading endpoints."""

import pytest

from app.content.models import MathInputQuestion, MultipleChoiceQuestion
from tests.conftest import CATALOG, FIRST, bearer

LESSON = CATALOG.lessons[FIRST].lesson
MC = next(q for q in LESSON.questions if isinstance(q, MultipleChoiceQuestion))
MATH = next(q for q in LESSON.questions if isinstance(q, MathInputQuestion))


@pytest.fixture
def headers(guest) -> dict:
    return bearer(guest)


def check(client, headers, question_id, answer, lesson=FIRST):
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
    assert mcv4u["lesson_count"] >= 9


def test_course_detail_lists_lesson_kinds_in_order(client):
    course = client.get("/api/v1/courses/mcv4u").json()
    lessons = [lesson for unit in course["units"] for lesson in unit["lessons"]]
    assert [lesson["kind"] for lesson in lessons[:3]] == ["learn", "practice", "destroyer"]
    assert lessons[0]["card_count"] > 0 and lessons[0]["topic"]


def test_unknown_course_is_404(client):
    assert client.get("/api/v1/courses/nope").status_code == 404


def test_lessons_require_sign_in(client):
    assert client.get(f"/api/v1/lessons/{FIRST}").status_code == 401
    assert check(client, {}, MC.id, 0).status_code == 401


def test_lesson_has_cards_and_questions_but_never_answers(client, headers):
    lesson = client.get(f"/api/v1/lessons/{FIRST}", headers=headers).json()
    assert lesson["kind"] == "learn"
    kinds = {item["type"] for item in lesson["items"]}
    assert "teach" in kinds and kinds & {"multiple_choice", "math_input"}
    for item in lesson["items"]:
        for secret in ("answer", "explanation", "display_answer", "tolerance"):
            assert secret not in item


def test_graphs_arrive_as_drawable_points(client, headers):
    lesson = client.get(f"/api/v1/lessons/{FIRST}", headers=headers).json()
    card = next(item for item in lesson["items"] if item["type"] == "teach")
    graph = next(block for block in card["blocks"] if block["type"] == "graph")
    path = graph["curves"][0]["paths"][0]
    assert len(path) > 50 and all(len(point) == 2 for point in path)
    assert "expr" not in graph["curves"][0]  # formulas stay on the server


def test_lesson_images_are_served(client):
    response = client.get("/assets/mcv4u/derivative-machine.svg")
    assert response.status_code == 200
    assert "svg" in response.headers["content-type"]


def test_multiple_choice_correct(client, headers):
    body = check(client, headers, MC.id, MC.answer).json()
    assert body["result"] == "correct"
    assert body["correct_choice"] == MC.answer
    assert body["explanation"]


def test_multiple_choice_incorrect_reveals_answer(client, headers):
    wrong = (MC.answer + 1) % len(MC.choices)
    body = check(client, headers, MC.id, wrong).json()
    assert body["result"] == "incorrect"
    assert body["correct_choice"] == MC.answer


def test_math_input_accepts_equivalent_form(client, headers):
    assert check(client, headers, MATH.id, f"2*({MATH.answer})/2").json()["result"] == "correct"


def test_math_input_incorrect(client, headers):
    body = check(client, headers, MATH.id, f"({MATH.answer}) + 1").json()
    assert body["result"] == "incorrect"
    assert body["correct_answer"] == (MATH.display_answer or MATH.answer)


def test_math_input_invalid_gives_message_without_answer(client, headers):
    body = check(client, headers, MATH.id, "57/").json()
    assert body["result"] == "invalid"
    assert body["message"]
    assert body["correct_answer"] is None
    assert body["explanation"] is None


def test_cards_cannot_be_graded(client, headers):
    card = LESSON.cards[0]
    assert check(client, headers, card.id, "1").status_code == 404


def test_unknown_question_is_404(client, headers):
    assert check(client, headers, "q999", "1").status_code == 404
    assert check(client, headers, MC.id, "1", lesson="nope").status_code == 404


def test_graph_choice_question_can_be_answered(client):
    """Regression: a correct answer that is a graph (not text) crashed the check endpoint."""
    lesson_id = "mcv4u-u1-t1-destroyer"
    lesson = CATALOG.lessons[lesson_id].lesson
    question = next(
        q
        for q in lesson.questions
        if isinstance(q, MultipleChoiceQuestion) and not isinstance(q.choices[q.answer], str)
    )
    guest = client.post("/api/v1/auth/guest", json={}).json()
    # Content checks don't need the lesson unlocked; grading works for any signed-in user.
    body = check(client, bearer(guest), question.id, question.answer, lesson=lesson_id).json()
    assert body["result"] == "correct"
    assert body["correct_answer"].startswith("Option ")


def test_course_list_has_catalog_fields_and_order(client):
    courses = client.get("/api/v1/courses").json()
    assert [c["id"] for c in courses][:4] == [
        "math-foundations",
        "science-foundations",
        "english-foundations",
        "mcr3u",
    ]
    mcr3u = next(c for c in courses if c["id"] == "mcr3u")
    assert mcr3u["category"] == "math" and mcr3u["status"] == "available"
    assert mcr3u["grade_label"].startswith("Grade 11")


def test_lessons_report_their_course_code(client, headers):
    lesson = client.get(f"/api/v1/lessons/{FIRST}", headers=headers).json()
    assert lesson["course_code"] == "MCV4U"
