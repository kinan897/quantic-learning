import uuid
from datetime import timedelta

import pytest

from app.db import SessionLocal
from app.models import User
from app.services.progress import local_today
from tests.conftest import CATALOG, FIRST, SECOND, bearer, correct_answer, play_lesson

FIRST_XP = CATALOG.lessons[FIRST].lesson.xp  # 10


@pytest.fixture
def headers(guest) -> dict:
    return bearer(guest)


def progress(client, headers) -> dict:
    return client.get("/api/v1/me/progress", headers=headers).json()


def test_second_lesson_is_locked_until_the_first_is_done(client, headers):
    assert client.get(f"/api/v1/lessons/{SECOND}", headers=headers).status_code == 403
    assert client.post(f"/api/v1/lessons/{SECOND}/sessions", headers=headers).status_code == 403

    play_lesson(client, headers, FIRST)

    assert client.get(f"/api/v1/lessons/{SECOND}", headers=headers).status_code == 200
    assert client.post(f"/api/v1/lessons/{SECOND}/sessions", headers=headers).status_code == 201


def test_perfect_first_run(client, headers):
    reward = play_lesson(client, headers, FIRST)
    assert reward["accuracy"] == 1
    assert reward["perfect_bonus"] == 5
    assert reward["xp_earned"] == FIRST_XP + 5
    assert reward["first_completion"] is True
    assert reward["streak"] == 1 and reward["streak_extended"] is True


def test_mistakes_lower_accuracy_and_skip_the_bonus(client, headers):
    reward = play_lesson(client, headers, FIRST, miss=frozenset({"q1"}))
    total = len(CATALOG.lessons[FIRST].lesson.questions)
    assert reward["accuracy"] == pytest.approx((total - 1) / total)
    assert reward["perfect_bonus"] == 0
    assert reward["xp_earned"] == FIRST_XP


def test_replays_earn_half_xp_and_keep_the_best_accuracy(client, headers):
    play_lesson(client, headers, FIRST)
    replay = play_lesson(client, headers, FIRST, miss=frozenset({"q1"}))
    assert replay["first_completion"] is False
    assert replay["xp_earned"] == FIRST_XP // 2
    assert replay["streak_extended"] is False  # same day

    record = progress(client, headers)["lessons"][FIRST]
    assert record["times_completed"] == 2
    assert record["best_accuracy"] == 1


def test_cannot_finish_without_answering_everything(client, headers):
    session_id = client.post(f"/api/v1/lessons/{FIRST}/sessions", headers=headers).json()[
        "session_id"
    ]
    client.post(
        f"/api/v1/lessons/{FIRST}/questions/q1/check",
        json={"answer": correct_answer(FIRST, "q1"), "session_id": session_id},
        headers=headers,
    )
    done = client.post(f"/api/v1/lessons/{FIRST}/sessions/{session_id}/complete", headers=headers)
    assert done.status_code == 409
    assert progress(client, headers)["total_xp"] == 0


def test_a_session_completes_only_once(client, headers):
    play_lesson(client, headers, FIRST)
    session_id = client.post(f"/api/v1/lessons/{FIRST}/sessions", headers=headers).json()[
        "session_id"
    ]
    for q in CATALOG.lessons[FIRST].lesson.questions:
        client.post(
            f"/api/v1/lessons/{FIRST}/questions/{q.id}/check",
            json={"answer": correct_answer(FIRST, q.id), "session_id": session_id},
            headers=headers,
        )
    url = f"/api/v1/lessons/{FIRST}/sessions/{session_id}/complete"
    assert client.post(url, headers=headers).status_code == 200
    assert client.post(url, headers=headers).status_code == 409


def test_typos_are_not_counted_against_first_try_accuracy(client, headers):
    session_id = client.post(f"/api/v1/lessons/{FIRST}/sessions", headers=headers).json()[
        "session_id"
    ]
    for q in CATALOG.lessons[FIRST].lesson.questions:
        if q.type == "math_input":
            typo = client.post(
                f"/api/v1/lessons/{FIRST}/questions/{q.id}/check",
                json={"answer": "2 +", "session_id": session_id},
                headers=headers,
            )
            assert typo.json()["result"] == "invalid"
        client.post(
            f"/api/v1/lessons/{FIRST}/questions/{q.id}/check",
            json={"answer": correct_answer(FIRST, q.id), "session_id": session_id},
            headers=headers,
        )
    reward = client.post(
        f"/api/v1/lessons/{FIRST}/sessions/{session_id}/complete", headers=headers
    ).json()
    assert reward["accuracy"] == 1


def test_other_users_cannot_use_my_session(client, headers):
    session_id = client.post(f"/api/v1/lessons/{FIRST}/sessions", headers=headers).json()[
        "session_id"
    ]
    intruder = bearer(client.post("/api/v1/auth/guest", json={}).json())
    stolen = client.post(
        f"/api/v1/lessons/{FIRST}/questions/q1/check",
        json={"answer": 0, "session_id": session_id},
        headers=intruder,
    )
    assert stolen.status_code == 404
    assert (
        client.post(
            f"/api/v1/lessons/{FIRST}/sessions/{session_id}/complete", headers=intruder
        ).status_code
        == 404
    )


def test_progress_summary(client, headers):
    reward = play_lesson(client, headers, FIRST)
    body = progress(client, headers)
    assert body["total_xp"] == reward["xp_earned"]
    assert body["streak"] == 1
    assert len(body["week"]) == 7
    assert body["week"][-1] == {"date": body["today"], "xp": reward["xp_earned"]}
    assert set(body["lessons"]) == {FIRST}


def _set_last_active(guest: dict, days_ago: int, streak: int) -> None:
    with SessionLocal() as db:
        user = db.get(User, uuid.UUID(guest["user"]["id"]))
        user.last_active_date = local_today(user) - timedelta(days=days_ago)
        user.streak_count = streak
        db.commit()


def test_streak_continues_from_yesterday(client, guest, headers):
    _set_last_active(guest, days_ago=1, streak=4)
    assert progress(client, headers)["streak"] == 4  # still alive today
    assert play_lesson(client, headers, FIRST)["streak"] == 5


def test_streak_resets_after_a_missed_day(client, guest, headers):
    _set_last_active(guest, days_ago=2, streak=9)
    assert progress(client, headers)["streak"] == 0
    assert play_lesson(client, headers, FIRST)["streak"] == 1
