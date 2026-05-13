"""Seed data: bootstrap admin user + sample violation types."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.config import get_settings
from app.models import Severity, User, UserRole, ViolationType

settings = get_settings()


SAMPLE_VIOLATION_TYPES = [
    {
        "code": "SPEEDING_LOW",
        "name_en": "Speeding (10-20 km/h over)",
        "name_ar": "تجاوز السرعة (10-20 كم/س فوق الحد)",
        "description": "Driver exceeded speed limit by 10-20 km/h",
        "default_severity": Severity.minor,
        "points": 1,
        "instant_ban": False,
    },
    {
        "code": "SPEEDING_HIGH",
        "name_en": "Speeding (>20 km/h over)",
        "name_ar": "تجاوز السرعة (>20 كم/س فوق الحد)",
        "description": "Driver exceeded speed limit by more than 20 km/h",
        "default_severity": Severity.major,
        "points": 2,
        "instant_ban": False,
    },
    {
        "code": "SEATBELT",
        "name_en": "Not wearing seatbelt",
        "name_ar": "عدم ارتداء حزام الأمان",
        "description": "Driver or passenger not wearing seatbelt",
        "default_severity": Severity.minor,
        "points": 1,
        "instant_ban": False,
    },
    {
        "code": "PHONE_USE",
        "name_en": "Mobile phone use while driving",
        "name_ar": "استخدام الهاتف المحمول أثناء القيادة",
        "description": "Driver using mobile phone while operating vehicle",
        "default_severity": Severity.major,
        "points": 2,
        "instant_ban": False,
    },
]


def seed_initial_data(db: Session) -> None:
    """Force recreate admin user + seed violation types."""

    admin_username = settings.BOOTSTRAP_ADMIN_USERNAME.lower()

    # =========================
    # Delete old admin
    # =========================

    existing_admin = (
        db.query(User)
        .filter(User.username == admin_username)
        .first()
    )

    if existing_admin:
        db.delete(existing_admin)
        db.commit()

    # =========================
    # Create fresh admin
    # =========================

    admin = User(
        username=admin_username,
        full_name=settings.BOOTSTRAP_ADMIN_FULL_NAME,
        role=UserRole.admin,
        is_active=True,
        hashed_password=hash_password(
            settings.BOOTSTRAP_ADMIN_PASSWORD
        ),
    )

    db.add(admin)

    # =========================
    # Seed violation types
    # =========================

    existing_codes = {
        row[0]
        for row in db.query(ViolationType.code).all()
    }

    for vt in SAMPLE_VIOLATION_TYPES:
        if vt["code"] not in existing_codes:
            db.add(ViolationType(**vt))

    db.commit()
