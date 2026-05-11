"""Violation Type management endpoints."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_admin, require_any
from app.database import get_db
from app.models import User, ViolationType
from app.schemas import ViolationTypeCreate, ViolationTypeOut, ViolationTypeUpdate

router = APIRouter(prefix="/api/violation-types", tags=["violation-types"])


@router.get("", response_model=list[ViolationTypeOut])
def list_types(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
    include_inactive: bool = True,
):
    q = db.query(ViolationType)
    if not include_inactive:
        q = q.filter(ViolationType.is_active.is_(True))
    return q.order_by(ViolationType.name_en).all()


@router.post("", response_model=ViolationTypeOut, status_code=status.HTTP_201_CREATED)
def create_type(
    request: Request,
    payload: ViolationTypeCreate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    if db.query(ViolationType).filter(ViolationType.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Code already exists")
    obj = ViolationType(**payload.model_dump())
    db.add(obj)
    db.flush()
    log_action(db, current, "create", "violation_type", obj.id, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{type_id}", response_model=ViolationTypeOut)
def update_type(
    type_id: int,
    request: Request,
    payload: ViolationTypeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    obj = db.query(ViolationType).filter(ViolationType.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Violation type not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    log_action(db, current, "update", "violation_type", obj.id, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_type(
    type_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    obj = db.query(ViolationType).filter(ViolationType.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Violation type not found")
    # If referenced, soft delete (deactivate) instead of hard delete
    from app.models import Violation
    in_use = db.query(Violation).filter(Violation.violation_type_id == type_id).first()
    if in_use:
        obj.is_active = False
        log_action(db, current, "deactivate", "violation_type", obj.id, request=request)
    else:
        db.delete(obj)
        log_action(db, current, "delete", "violation_type", type_id, request=request)
    db.commit()
    return None
