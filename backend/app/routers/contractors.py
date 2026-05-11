"""Contractor management endpoints."""
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_admin, require_data_entry, require_any
from app.database import get_db
from app.models import Contractor, Driver, DriverStatus, User, Violation
from app.schemas import ContractorCreate, ContractorOut, ContractorUpdate

router = APIRouter(prefix="/api/contractors", tags=["contractors"])


def _to_out(db: Session, c: Contractor) -> ContractorOut:
    driver_count = db.query(func.count(Driver.id)).filter(Driver.contractor_id == c.id).scalar() or 0
    violating_driver_count = (
        db.query(func.count(Driver.id.distinct()))
        .join(Violation, Violation.driver_id == Driver.id)
        .filter(Driver.contractor_id == c.id)
        .scalar()
        or 0
    )
    total_violations = (
        db.query(func.count(Violation.id))
        .join(Driver, Driver.id == Violation.driver_id)
        .filter(Driver.contractor_id == c.id)
        .scalar()
        or 0
    )
    data = ContractorOut.model_validate(c)
    data.driver_count = int(driver_count)
    data.violating_driver_count = int(violating_driver_count)
    data.total_violations = int(total_violations)
    return data


@router.get("", response_model=list[ContractorOut])
def list_contractors(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
    q: Optional[str] = None,
    include_inactive: bool = True,
):
    query = db.query(Contractor)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Contractor.name.ilike(like), Contractor.name_ar.ilike(like)))
    if not include_inactive:
        query = query.filter(Contractor.is_active.is_(True))
    rows = query.order_by(Contractor.name).all()
    return [_to_out(db, c) for c in rows]


@router.get("/{contractor_id}", response_model=ContractorOut)
def get_contractor(
    contractor_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
):
    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return _to_out(db, c)


@router.post("", response_model=ContractorOut, status_code=status.HTTP_201_CREATED)
def create_contractor(
    request: Request,
    payload: ContractorCreate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_data_entry)],
):
    if db.query(Contractor).filter(func.lower(Contractor.name) == payload.name.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Contractor with this name already exists")
    c = Contractor(**payload.model_dump())
    db.add(c)
    db.flush()
    log_action(db, current, "create", "contractor", c.id, request=request)
    db.commit()
    db.refresh(c)
    return _to_out(db, c)


@router.patch("/{contractor_id}", response_model=ContractorOut)
def update_contractor(
    contractor_id: int,
    request: Request,
    payload: ContractorUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_data_entry)],
):
    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    log_action(db, current, "update", "contractor", c.id, request=request)
    db.commit()
    db.refresh(c)
    return _to_out(db, c)


@router.delete("/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contractor(
    contractor_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contractor not found")
    db.delete(c)
    log_action(db, current, "delete", "contractor", contractor_id, request=request)
    db.commit()
    return None
