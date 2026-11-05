import os

# Must run before the app is imported: a private in-memory database for tests.
os.environ["QL_ENV"] = "test"
os.environ["QL_DATABASE_URL"] = "sqlite://"
os.environ["QL_AUTO_MIGRATE"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: E402, F401
from app.content.loader import load_catalog  # noqa: E402
from app.content.models import MultipleChoiceQuestion  # noqa: E402
from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.rate_limit import auth_rate_limit  # noqa: E402

CATALOG = load_catalog()
FIRST, SECOND = "mcv4u-u1-l1", "mcv4u-u1-l2"


@pytest.fixture(autouse=True)
def fresh_database():
    Base.metadata.create_all(engine)
    auth_rate_limit.reset()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def bearer(auth: dict) -> dict:
    return {"Authorization": f"Bearer {auth['access_token']}"}


@pytest.fixture
def guest(client) -> dict:
    response = client.post("/api/v1/auth/guest", json={"timezone": "America/Toronto"})
    assert response.status_code == 201
    return response.json()


def correct_answer(lesson_id: str, question_id: str):
    question = CATALOG.lessons[lesson_id].lesson.question(question_id)
    return question.answer


def wrong_answer(lesson_id: str, question_id: str):
    question = CATALOG.lessons[lesson_id].lesson.question(question_id)
    if isinstance(question, MultipleChoiceQuestion):
        return (question.answer + 1) % len(question.choices)
    return "12345"


def play_lesson(client, headers: dict, lesson_id: str, miss: frozenset[str] = frozenset()) -> dict:
    """Play a lesson the way the app does. Questions in `miss` are answered wrong first,
    then retried. Returns the completion response JSON."""
    session = client.post(f"/api/v1/lessons/{lesson_id}/sessions", headers=headers)
    assert session.status_code == 201, session.text
    session_id = session.json()["session_id"]

    def answer(question_id: str, value) -> dict:
        response = client.post(
            f"/api/v1/lessons/{lesson_id}/questions/{question_id}/check",
            json={"answer": value, "session_id": session_id},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        return response.json()

    question_ids = [q.id for q in CATALOG.lessons[lesson_id].lesson.questions]
    for qid in question_ids:
        if qid in miss:
            assert answer(qid, wrong_answer(lesson_id, qid))["result"] == "incorrect"
        else:
            assert answer(qid, correct_answer(lesson_id, qid))["result"] == "correct"
    for qid in question_ids:
        if qid in miss:
            assert answer(qid, correct_answer(lesson_id, qid))["result"] == "correct"

    done = client.post(
        f"/api/v1/lessons/{lesson_id}/sessions/{session_id}/complete", headers=headers
    )
    assert done.status_code == 200, done.text
    return done.json()
