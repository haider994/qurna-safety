"""Violation logging endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.audit import log_action
from app.auth import require_admin, require_data_entry, require_any
from app.database import get_db
from app.models import Driver, Severity, User, Violation, ViolationType
from app.schemas import ViolationCreate, ViolationOut, ViolationUpdate
from app.violation_logic import recompute_driver_status

router = APIRouter(prefix="/api/violations", tags=["violations"])


def _to_out(v: Violation) -> ViolationOut:
    return ViolationOut(
        id=v.id,
        driver_id=v.driver_id,
        driver_name=v.driver.full_name if v.driver else None,
        contractor_id=v.driver.contractor_id if v.driver else None,
        contractor_name=v.driver.contractor.name if v.driver and v.driver.contractor else None,
        violation_type_id=v.violation_type_id,
        violation_type_code=v.violation_type.code if v.violation_type else None,
        violation_type_name_en=v.violation_type.name_en if v.violation_type else None,
        violation_type_name_ar=v.violation_type.name_ar if v.violation_type else None,
        severity=v.severity,
        occurred_at=v.occurred_at,
        location=v.location,
        vehicle_plate=v.vehicle_plate,
        speed_kmh=v.speed_kmh,
        description=v.description,
        attachment_url=v.attachment_url,
        reported_by=v.reported_by,
        triggered_status=v.triggered_status,
        created_at=v.created_at,
    )


@router.get("", response_model=list[ViolationOut])
def list_violations(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
    q: Optional[str] = None,
    driver_id: Optional[int] = None,
    contractor_id: Optional[int] = None,
    violation_type_id: Optional[int] = None,
    severity: Optional[Severity] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    query = (
        db.query(Violation)
        .options(joinedload(Violation.driver).joinedload(Driver.contractor))
        .options(joinedload(Violation.violation_type))
    )
    if driver_id is not None:
        query = query.filter(Violation.driver_id == driver_id)
    if contractor_id is not None:
        query = query.join(Driver, Driver.id == Violation.driver_id).filter(
            Driver.contractor_id == contractor_id
        )
    if violation_type_id is not None:
        query = query.filter(Violation.violation_type_id == violation_type_id)
    if severity is not None:
        query = query.filter(Violation.severity == severity)
    if date_from is not None:
        query = query.filter(Violation.occurred_at >= date_from)
    if date_to is not None:
        query = query.filter(Violation.occurred_at <= date_to)
    if q:
        like = f"%{q.strip()}%"
        query = query.join(Driver, Driver.id == Violation.driver_id, isouter=True).filter(
            or_(
                Violation.location.ilike(like),
                Violation.description.ilike(like),
                Violation.vehicle_plate.ilike(like),
                Driver.full_name.ilike(like),
                Driver.full_name_ar.ilike(like),
            )
        )

    rows = (
        query.order_by(Violation.occurred_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_to_out(v) for v in rows]


@router.get("/{violation_id}", response_model=ViolationOut)
def get_violation(
    violation_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
):
    v = (
        db.query(Violation)
        .options(joinedload(Violation.driver).joinedload(Driver.contractor))
        .options(joinedload(Violation.violation_type))
        .filter(Violation.id == violation_id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    return _to_out(v)


@router.post("", response_model=ViolationOut, status_code=status.HTTP_201_CREATED)
def create_violation(
    request: Request,
    payload: ViolationCreate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_data_entry)],
):
    driver = db.query(Driver).filter(Driver.id == payload.driver_id).first()
    if not driver:
        raise HTTPException(status_code=400, detail="Driver not found")
    vtype = db.query(ViolationType).filter(ViolationType.id == payload.violation_type_id).first()
    if not vtype:
        raise HTTPException(status_code=400, detail="Violation type not found")
    if not vtype.is_active:
        raise HTTPException(status_code=400, detail="Violation type is inactive")

    severity = payload.severity or vtype.default_severity
    v = Violation(
        driver_id=payload.driver_id,
        violation_type_id=payload.violation_type_id,
        severity=severity,
        occurred_at=payload.occurred_at,
        location=payload.location,
        vehicle_plate=payload.vehicle_plate,
        speed_kmh=payload.speed_kmh,
        description=payload.description,
        attachment_url=payload.attachment_url,
        reported_by=payload.reported_by,
        created_by_user_id=current.id,
    )
    db.add(v)
    db.flush()

    new_status = recompute_driver_status(db, driver)
    v.triggered_status = new_status

    log_action(
        db, current, "create", "violation", v.id,
        details=f"driver_id={driver.id} type={vtype.code} severity={severity.value} new_status={new_status.value}",
        request=request,
    )
    db.commit()
    db.refresh(v)
    # Reload with joins for output
    v = (
        db.query(Violation)
        .options(joinedload(Violation.driver).joinedload(Driver.contractor))
        .options(joinedload(Violation.violation_type))
        .filter(Violation.id == v.id)
        .first()
    )
    return _to_out(v)


@router.patch("/{violation_id}", response_model=ViolationOut)
def update_violation(
    violation_id: int,
    request: Request,
    payload: ViolationUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_data_entry)],
):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    for k, val in payload.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    driver = db.query(Driver).filter(Driver.id == v.driver_id).first()
    if driver:
        recompute_driver_status(db, driver)
    log_action(db, current, "update", "violation", v.id, request=request)
    db.commit()
    db.refresh(v)
    v = (
        db.query(Violation)
        .options(joinedload(Violation.driver).joinedload(Driver.contractor))
        .options(joinedload(Violation.violation_type))
        .filter(Violation.id == v.id)
        .first()
    )
    return _to_out(v)


@router.delete("/{violation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_violation(
    violation_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    driver_id = v.driver_id
    db.delete(v)
    db.flush()
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if driver:
        # If admin removes a critical violation, lift blacklist so recompute can lower status
        driver.is_blacklisted = False
        recompute_driver_status(db, driver)
    log_action(db, current, "delete", "violation", violation_id, request=request)
    db.commit()
    return None
