from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select

from app.dependencies import DbSession, OptionalUser
from app.models import User
from app.rate_limit import auth_rate_limit
from app.schemas import (
    AuthResponse,
    GuestRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    UserOut,
)
from app.security import hash_password, needs_rehash, verify_password
from app.services.auth import (
    AuthError,
    TokenPair,
    clean_timezone,
    issue_tokens,
    normalize_email,
    revoke_refresh_token,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _response(user: User, tokens: TokenPair) -> AuthResponse:
    return AuthResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
        user=UserOut.model_validate(user, from_attributes=True),
    )


@router.post("/guest", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def create_guest(body: GuestRequest, db: DbSession) -> AuthResponse:
    """Start as a guest. Progress is saved right away and kept if the student signs up later."""
    user = User(is_guest=True, timezone=clean_timezone(body.timezone))
    db.add(user)
    db.commit()
    return _response(user, issue_tokens(db, user))


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_rate_limit)],
)
def register(body: RegisterRequest, db: DbSession, current: OptionalUser) -> AuthResponse:
    """Create an account. If called by a guest, the guest is upgraded in place, so all of
    their XP, streak and lesson progress carries over."""
    if current is not None and not current.is_guest:
        raise HTTPException(status.HTTP_409_CONFLICT, "You're already signed in.")

    email = normalize_email(body.email)
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    user = current or User(timezone=clean_timezone(body.timezone))
    user.email = email
    user.password_hash = hash_password(body.password)
    user.display_name = body.display_name
    user.is_guest = False
    if body.timezone:
        user.timezone = clean_timezone(body.timezone)
    db.add(user)
    db.commit()
    return _response(user, issue_tokens(db, user))


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(auth_rate_limit)])
def login(body: LoginRequest, db: DbSession) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == normalize_email(body.email)))
    # verify_password runs even when the user doesn't exist, so response time doesn't
    # reveal which emails have accounts.
    if not verify_password(body.password, user.password_hash if user else None) or user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if user.password_hash and needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
        db.commit()
    return _response(user, issue_tokens(db, user))


@router.post("/refresh", response_model=AuthResponse)
def refresh(body: RefreshRequest, db: DbSession) -> AuthResponse:
    try:
        user, tokens = rotate_refresh_token(db, body.refresh_token)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from None
    return _response(user, tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: RefreshRequest, db: DbSession) -> Response:
    revoke_refresh_token(db, body.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
