"""Business logic for driver status based on violations and thresholds."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Driver, DriverStatus, Violation, ViolationType

settings = get_settings()


def recompute_driver_status(db: Session, driver: Driver) -> DriverStatus:
    """Recompute and persist a driver's status based on their violations.

    Rules (configurable via settings):
      - Any violation linked to a ViolationType with `instant_ban=True` -> banned
      - Otherwise compute by count vs THRESHOLD_NOTICE / WARNING / SUSPENSION / BAN
      - Manual `is_blacklisted=True` -> banned
    """
    if driver.is_blacklisted:
        driver.status = DriverStatus.banned
        return driver.status

    violations = (
        db.query(Violation)
        .filter(Violation.driver_id == driver.id)
        .all()
    )
    count = len(violations)

    # Check for any instant-ban violation type
    if count > 0:
        type_ids = {v.violation_type_id for v in violations}
        if type_ids:
            instant_ban_types = (
                db.query(ViolationType.id)
                .filter(ViolationType.id.in_(type_ids))
                .filter(ViolationType.instant_ban.is_(True))
                .all()
            )
            if instant_ban_types:
                driver.is_blacklisted = True
                driver.status = DriverStatus.banned
                return driver.status

    if count >= settings.THRESHOLD_BAN:
        driver.status = DriverStatus.banned
        driver.is_blacklisted = True
    elif count >= settings.THRESHOLD_SUSPENSION:
        driver.status = DriverStatus.suspended
    elif count >= settings.THRESHOLD_WARNING:
        driver.status = DriverStatus.warning
    elif count >= settings.THRESHOLD_NOTICE:
        driver.status = DriverStatus.notice
    else:
        driver.status = DriverStatus.active

    return driver.status
