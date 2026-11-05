from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import utcnow
from app.models import RefreshToken, User
from app.security import create_access_token, hash_token, new_refresh_token

DEFAULT_TIMEZONE = "America/Toronto"


class AuthError(Exception):
    """Credentials or token rejected. The message is safe to show the user."""


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str
    expires_in: int  # seconds until the access token expires


def clean_timezone(name: str | None) -> str:
    if not name:
        return DEFAULT_TIMEZONE
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return DEFAULT_TIMEZONE
    return name


def normalize_email(email: str) -> str:
    return email.strip().lower()


def issue_tokens(db: Session, user: User, family_id: uuid.UUID | None = None) -> TokenPair:
    settings = get_settings()
    raw = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            family_id=family_id or uuid.uuid4(),
            token_hash=hash_token(raw),
            expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    db.commit()
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=raw,
        expires_in=settings.access_token_minutes * 60,
    )


def rotate_refresh_token(db: Session, raw: str) -> tuple[User, TokenPair]:
    """Swap a refresh token for a new pair. Detects reuse of an already-rotated token."""
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
    if row is None:
        raise AuthError("Your session has expired. Please sign in again.")

    now = utcnow()
    if row.revoked_at is not None:
        # A token we already rotated away was presented again. Assume it leaked and log
        # out every device in this login chain.
        _revoke_family(db, row.family_id)
        raise AuthError("Your session has expired. Please sign in again.")
    if row.expires_at <= now:
        raise AuthError("Your session has expired. Please sign in again.")

    row.revoked_at = now
    user = db.get(User, row.user_id)
    if user is None:  # pragma: no cover - cascade delete removes tokens with the user
        raise AuthError("Your session has expired. Please sign in again.")
    return user, issue_tokens(db, user, family_id=row.family_id)


def revoke_refresh_token(db: Session, raw: str) -> None:
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
    if row is not None:
        _revoke_family(db, row.family_id)


def _revoke_family(db: Session, family_id: uuid.UUID) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    db.commit()
