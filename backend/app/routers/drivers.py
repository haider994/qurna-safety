"""Driver management endpoints."""
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth import require_admin, require_data_entry, require_any
from app.database import get_db
from app.models import Contractor, Driver, DriverStatus, User, Violation
from app.schemas import DriverCreate, DriverOut, DriverUpdate
from app.violation_logic import recompute_driver_status

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


def _to_out(db: Session, d: Driver) -> DriverOut:
    count = db.query(func.count(Violation.id)).filter(Violation.driver_id == d.id).scalar() or 0
    out = DriverOut.model_validate(d)
    out.violation_count = int(count)
    out.contractor_name = d.contractor.name if d.contractor else None
    return out


@router.get("", response_model=list[DriverOut])
def list_drivers(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
    q: Optional[str] = None,
    contractor_id: Optional[int] = None,
    status_filter: Optional[DriverStatus] = None,
    include_inactive: bool = True,
):
    query = db.query(Driver)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Driver.full_name.ilike(like),
                Driver.full_name_ar.ilike(like),
                Driver.national_id.ilike(like),
                Driver.license_number.ilike(like),
            )
        )
    if contractor_id is not None:
        query = query.filter(Driver.contractor_id == contractor_id)
    if status_filter is not None:
        query = query.filter(Driver.status == status_filter)
    if not include_inactive:
        query = query.filter(Driver.is_active.is_(True))
    rows = query.order_by(Driver.full_name).all()
    return [_to_out(db, d) for d in rows]


@router.get("/{driver_id}", response_model=DriverOut)
def get_driver(
    driver_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
):
    d = db.query(Driver).filter(Driver.id == driver_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")
    return _to_out(db, d)


@router.post("", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
def create_driver(
    request: Request,
    payload: DriverCreate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_data_entry)],
):
    if payload.national_id:
        if db.query(Driver).filter(Driver.national_id == payload.national_id).first():
            raise HTTPException(status_code=400, detail="Driver with this national ID already exists")
    if payload.license_number:
        if db.query(Driver).filter(Driver.license_number == payload.license_number).first():
            raise HTTPException(status_code=400, detail="Driver with this license number already exists")
    if payload.contractor_id is not None:
        if not db.query(Contractor).filter(Contractor.id == payload.contractor_id).first():
            raise HTTPException(status_code=400, detail="Contractor not found")

    d = Driver(**payload.model_dump())
    db.add(d)
    db.flush()
    log_action(db, current, "create", "driver", d.id, request=request)
    db.commit()
    db.refresh(d)
    return _to_out(db, d)


@router.patch("/{driver_id}", response_model=DriverOut)
def update_driver(
    driver_id: int,
    request: Request,
    payload: DriverUpdate,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_data_entry)],
):
    d = db.query(Driver).filter(Driver.id == driver_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")

    data = payload.model_dump(exclude_unset=True)

    # Uniqueness checks
    if "national_id" in data and data["national_id"]:
        exists = (
            db.query(Driver)
            .filter(Driver.national_id == data["national_id"], Driver.id != driver_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=400, detail="National ID already in use")
    if "license_number" in data and data["license_number"]:
        exists = (
            db.query(Driver)
            .filter(Driver.license_number == data["license_number"], Driver.id != driver_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=400, detail="License number already in use")
    if "contractor_id" in data and data["contractor_id"] is not None:
        if not db.query(Contractor).filter(Contractor.id == data["contractor_id"]).first():
            raise HTTPException(status_code=400, detail="Contractor not found")

    status_override = data.pop("status", None)
    blacklist_change = data.get("is_blacklisted")

    for k, v in data.items():
        setattr(d, k, v)

    # Recompute status unless admin explicitly overrode it
    if status_override is not None and current.role.value == "admin":
        d.status = status_override
        if status_override == DriverStatus.banned:
            d.is_blacklisted = True
    else:
        recompute_driver_status(db, d)
        if status_override is not None:
            # non-admin tried to override; ignore silently
            pass

    log_action(db, current, "update", "driver", d.id, request=request)
    db.commit()
    db.refresh(d)
    return _to_out(db, d)


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    d = db.query(Driver).filter(Driver.id == driver_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")
    db.delete(d)
    log_action(db, current, "delete", "driver", driver_id, request=request)
    db.commit()
    return None


@router.post("/{driver_id}/reinstate", response_model=DriverOut)
def reinstate_driver(
    driver_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(require_admin)],
):
    """Admin override to clear blacklist and reset status (does not delete violations)."""
    d = db.query(Driver).filter(Driver.id == driver_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")
    d.is_blacklisted = False
    d.status = DriverStatus.active
    log_action(db, current, "reinstate", "driver", d.id, request=request)
    db.commit()
    db.refresh(d)
    return _to_out(db, d)
