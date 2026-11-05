import pytest

from tests.conftest import FIRST, bearer, play_lesson

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
REFRESH = "/api/v1/auth/refresh"


def register(client, email="ada@example.com", password="correct horse", headers=None):
    return client.post(
        REGISTER,
        json={
            "email": email,
            "password": password,
            "display_name": "Ada",
            "timezone": "America/Toronto",
        },
        headers=headers or {},
    )


def test_guest_account(client, guest):
    assert guest["user"]["is_guest"] is True
    assert guest["user"]["email"] is None
    me = client.get("/api/v1/me", headers=bearer(guest))
    assert me.status_code == 200
    assert me.json()["id"] == guest["user"]["id"]


def test_invalid_timezone_falls_back_to_toronto(client):
    body = client.post("/api/v1/auth/guest", json={"timezone": "Mars/Olympus"}).json()
    assert body["user"]["timezone"] == "America/Toronto"


def test_register_and_login(client):
    created = register(client)
    assert created.status_code == 201
    assert created.json()["user"]["is_guest"] is False

    login = client.post(LOGIN, json={"email": "ADA@example.com", "password": "correct horse"})
    assert login.status_code == 200
    assert login.json()["user"]["email"] == "ada@example.com"


def test_email_is_unique_ignoring_case(client):
    assert register(client).status_code == 201
    duplicate = register(client, email="Ada@Example.com")
    assert duplicate.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "not-an-email", "password": "long enough", "display_name": "A"},
        {"email": "a@example.com", "password": "short", "display_name": "A"},
        {"email": "a@example.com", "password": "long enough", "display_name": "   "},
    ],
)
def test_register_validation(client, payload):
    assert client.post(REGISTER, json=payload).status_code == 422


def test_wrong_password_and_unknown_email_look_the_same(client):
    register(client)
    wrong = client.post(LOGIN, json={"email": "ada@example.com", "password": "nope nope"})
    unknown = client.post(LOGIN, json={"email": "who@example.com", "password": "nope nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_guest_upgrade_keeps_progress(client, guest):
    play_lesson(client, bearer(guest), FIRST)

    upgraded = register(client, headers=bearer(guest))
    assert upgraded.status_code == 201
    body = upgraded.json()
    assert body["user"]["id"] == guest["user"]["id"]
    assert body["user"]["is_guest"] is False

    progress = client.get("/api/v1/me/progress", headers=bearer(body)).json()
    assert progress["total_xp"] > 0
    assert FIRST in progress["lessons"]


def test_signed_in_user_cannot_register_again(client):
    account = register(client).json()
    again = register(client, email="other@example.com", headers=bearer(account))
    assert again.status_code == 409


def test_refresh_rotates_tokens(client, guest):
    rotated = client.post(REFRESH, json={"refresh_token": guest["refresh_token"]})
    assert rotated.status_code == 200
    new = rotated.json()
    assert new["refresh_token"] != guest["refresh_token"]
    assert client.get("/api/v1/me", headers=bearer(new)).status_code == 200


def test_reusing_a_rotated_refresh_token_revokes_the_session(client, guest):
    new = client.post(REFRESH, json={"refresh_token": guest["refresh_token"]}).json()

    # The old token shows up again (e.g. stolen). Reject it, and kill the whole chain.
    replay = client.post(REFRESH, json={"refresh_token": guest["refresh_token"]})
    assert replay.status_code == 401
    assert client.post(REFRESH, json={"refresh_token": new["refresh_token"]}).status_code == 401


def test_logout_revokes_refresh_token(client, guest):
    assert (
        client.post(
            "/api/v1/auth/logout", json={"refresh_token": guest["refresh_token"]}
        ).status_code
        == 204
    )
    assert client.post(REFRESH, json={"refresh_token": guest["refresh_token"]}).status_code == 401


@pytest.mark.parametrize("token", ["garbage", "a.b.c", ""])
def test_bad_access_tokens_are_rejected(client, token):
    response = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_refresh_token_is_not_an_access_token(client, guest):
    response = client.get(
        "/api/v1/me", headers={"Authorization": f"Bearer {guest['refresh_token']}"}
    )
    assert response.status_code == 401


def test_login_is_rate_limited(client):
    for _ in range(10):
        client.post(LOGIN, json={"email": "x@example.com", "password": "whatever1"})
    blocked = client.post(LOGIN, json={"email": "x@example.com", "password": "whatever1"})
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
