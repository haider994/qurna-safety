"""Authentication endpoints."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import authenticate_user, create_access_token, get_current_user
from app.database import get_db
from app.models import User
from app.schemas import LoginIn, Token, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    payload: LoginIn,
    db: Annotated[Session, Depends(get_db)],
):
    user = authenticate_user(db, payload.username.strip(), payload.password)
    if not user:
        # Log failed attempts (without password)
        log_action(
            db, None, "login_failed", "auth", details=f"username={payload.username}",
            request=request,
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(subject=user.username, role=user.role.value)
    log_action(db, user, "login", "auth", entity_id=user.id, request=request)
    db.commit()
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current: Annotated[User, Depends(get_current_user)]):
    return current
