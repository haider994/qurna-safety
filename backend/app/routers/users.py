"""User management endpoints (admin only)."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import get_current_user, hash_password, require_admin
from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    request: Request,
    payload: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    username = payload.username.strip().lower()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if payload.email and db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already in use")

    user = User(
        username=username,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    log_action(db, current, "create", "user", user.id, request=request)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    request: Request,
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.email is not None:
        if payload.email and (
            db.query(User).filter(User.email == payload.email, User.id != user_id).first()
        ):
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = payload.email
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        if user.id == current.id and payload.role != UserRole.admin:
            raise HTTPException(status_code=400, detail="Cannot demote yourself")
        user.role = payload.role
    if payload.is_active is not None:
        if user.id == current.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = hash_password(payload.password)

    log_action(db, current, "update", "user", user.id, request=request)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    log_action(db, current, "delete", "user", user_id, request=request)
    db.commit()
    return None
