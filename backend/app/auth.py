"""Authentication helpers: password hashing, JWT, current user dependency."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte limit; truncate to be safe (still strong).
    return pwd_context.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain[:72], hashed)
    except Exception:
        return False


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
    secret = settings.resolved_jwt_secret()
    exp_min = expires_minutes if expires_minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_min)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    secret = settings.resolved_jwt_secret()
    return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def _credentials_exc(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    # Allow token via query string for direct file downloads (PDF/Excel)
    # since browser <a href> cannot set Authorization header.
    if not token:
        qtoken = request.query_params.get("_t")
        if qtoken:
            token = qtoken
    if not token:
        raise _credentials_exc("Missing authentication token")
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if not username:
            raise _credentials_exc()
    except JWTError:
        raise _credentials_exc("Invalid or expired token")

    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise _credentials_exc("User inactive or not found")
    return user


def require_roles(*roles: UserRole):
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return checker


require_admin = require_roles(UserRole.admin)
require_data_entry = require_roles(UserRole.admin, UserRole.data_entry)
require_any = require_roles(UserRole.admin, UserRole.data_entry, UserRole.viewer)
