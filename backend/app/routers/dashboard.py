"""Dashboard analytics endpoint."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_any
from app.config import get_settings
from app.database import get_db
from app.models import Contractor, Driver, DriverStatus, Severity, User, Violation, ViolationType
from app.schemas import (
    ContractorRisk,
    DashboardData,
    DashboardStats,
    SeverityBreakdown,
    TimeBucket,
    TopItem,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

settings = get_settings()


@router.get("", response_model=DashboardData)
def get_dashboard(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_any)],
):
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_week = start_today - timedelta(days=start_today.weekday())
    start_month = start_today.replace(day=1)
    start_30d = start_today - timedelta(days=29)

    total_drivers = db.query(func.count(Driver.id)).scalar() or 0
    total_contractors = db.query(func.count(Contractor.id)).scalar() or 0
    total_violations = db.query(func.count(Violation.id)).scalar() or 0

    violations_today = (
        db.query(func.count(Violation.id)).filter(Violation.occurred_at >= start_today).scalar() or 0
    )
    violations_this_week = (
        db.query(func.count(Violation.id)).filter(Violation.occurred_at >= start_week).scalar() or 0
    )
    violations_this_month = (
        db.query(func.count(Violation.id)).filter(Violation.occurred_at >= start_month).scalar() or 0
    )

    def count_status(s: DriverStatus) -> int:
        return db.query(func.count(Driver.id)).filter(Driver.status == s).scalar() or 0

    stats = DashboardStats(
        total_drivers=int(total_drivers),
        total_contractors=int(total_contractors),
        total_violations=int(total_violations),
        violations_today=int(violations_today),
        violations_this_week=int(violations_this_week),
        violations_this_month=int(violations_this_month),
        active_drivers=int(count_status(DriverStatus.active)),
        banned_drivers=int(count_status(DriverStatus.banned)),
        suspended_drivers=int(count_status(DriverStatus.suspended)),
        warning_drivers=int(count_status(DriverStatus.warning)),
        notice_drivers=int(count_status(DriverStatus.notice)),
    )

    # Violations by day - last 30 days
    rows = (
        db.query(func.date(Violation.occurred_at).label("d"), func.count(Violation.id))
        .filter(Violation.occurred_at >= start_30d)
        .group_by("d")
        .all()
    )
    by_day_map = {str(r[0]): int(r[1]) for r in rows}
    violations_by_day: list[TimeBucket] = []
    for i in range(30):
        day = (start_30d + timedelta(days=i)).date().isoformat()
        violations_by_day.append(TimeBucket(bucket=day, count=by_day_map.get(day, 0)))

    # Violations by type
    type_rows = (
        db.query(ViolationType.id, ViolationType.name_en, ViolationType.name_ar, func.count(Violation.id))
        .join(Violation, Violation.violation_type_id == ViolationType.id)
        .group_by(ViolationType.id, ViolationType.name_en, ViolationType.name_ar)
        .order_by(func.count(Violation.id).desc())
        .limit(10)
        .all()
    )
    violations_by_type = [
        TopItem(id=r[0], name=r[1], count=int(r[3]), extra=r[2]) for r in type_rows
    ]

    # Top drivers
    drv_rows = (
        db.query(Driver.id, Driver.full_name, Driver.full_name_ar, func.count(Violation.id))
        .join(Violation, Violation.driver_id == Driver.id)
        .group_by(Driver.id, Driver.full_name, Driver.full_name_ar)
        .order_by(func.count(Violation.id).desc())
        .limit(10)
        .all()
    )
    top_drivers = [TopItem(id=r[0], name=r[1], count=int(r[3]), extra=r[2]) for r in drv_rows]

    # Top contractors
    con_rows = (
        db.query(Contractor.id, Contractor.name, func.count(Violation.id))
        .join(Driver, Driver.contractor_id == Contractor.id)
        .join(Violation, Violation.driver_id == Driver.id)
        .group_by(Contractor.id, Contractor.name)
        .order_by(func.count(Violation.id).desc())
        .limit(10)
        .all()
    )
    top_contractors = [TopItem(id=r[0], name=r[1], count=int(r[2])) for r in con_rows]

    # Severity breakdown
    sev_rows = dict(
        db.query(Violation.severity, func.count(Violation.id)).group_by(Violation.severity).all()
    )
    severity = SeverityBreakdown(
        minor=int(sev_rows.get(Severity.minor, 0)),
        major=int(sev_rows.get(Severity.major, 0)),
        critical=int(sev_rows.get(Severity.critical, 0)),
    )

    # Contractor risk (drivers with at least 1 violation as percent of total drivers)
    contractor_risk: list[ContractorRisk] = []
    contractors = db.query(Contractor).all()
    for c in contractors:
        d_count = db.query(func.count(Driver.id)).filter(Driver.contractor_id == c.id).scalar() or 0
        v_drv_count = (
            db.query(func.count(Driver.id.distinct()))
            .join(Violation, Violation.driver_id == Driver.id)
            .filter(Driver.contractor_id == c.id)
            .scalar()
            or 0
        )
        total_v = (
            db.query(func.count(Violation.id))
            .join(Driver, Driver.id == Violation.driver_id)
            .filter(Driver.contractor_id == c.id)
            .scalar()
            or 0
        )
        pct = (float(v_drv_count) / float(d_count) * 100.0) if d_count else 0.0
        is_risk = pct >= settings.CONTRACTOR_WARN_PERCENT and d_count > 0
        if total_v > 0 or is_risk:
            contractor_risk.append(
                ContractorRisk(
                    contractor_id=c.id,
                    contractor_name=c.name,
                    driver_count=int(d_count),
                    violating_driver_count=int(v_drv_count),
                    violating_percent=round(pct, 1),
                    total_violations=int(total_v),
                    is_risk=is_risk,
                )
            )
    contractor_risk.sort(key=lambda x: (-x.violating_percent, -x.total_violations))

    return DashboardData(
        stats=stats,
        violations_by_day=violations_by_day,
        violations_by_type=violations_by_type,
        top_drivers=top_drivers,
        top_contractors=top_contractors,
        severity_breakdown=severity,
        contractor_risk=contractor_risk,
    )
