"""Shared FastAPI dependencies. Tests can swap these with ``app.dependency_overrides``."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.content.loader import Catalog, get_catalog
from app.db import get_db
from app.models import User
from app.security import InvalidTokenError, decode_access_token

CatalogDep = Annotated[Catalog, Depends(get_catalog)]
DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def _unauthorized(detail: str = "Please sign in.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_optional_user(db: DbSession, credentials: BearerCredentials) -> User | None:
    if credentials is None:
        return None
    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError:
        raise _unauthorized("Your session has expired.") from None
    user = db.get(User, user_id)
    if user is None:
        raise _unauthorized()
    return user


def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    if user is None:
        raise _unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
