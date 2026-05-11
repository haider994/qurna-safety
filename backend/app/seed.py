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
    {
        "code": "NO_PPE",
        "name_en": "No PPE (helmet/vest)",
        "name_ar": "عدم ارتداء معدات الوقاية الشخصية",
        "description": "Driver not wearing required PPE in the field",
        "default_severity": Severity.minor,
        "points": 1,
        "instant_ban": False,
    },
    {
        "code": "RECKLESS",
        "name_en": "Reckless driving",
        "name_ar": "قيادة متهورة",
        "description": "Aggressive or dangerous driving behavior",
        "default_severity": Severity.major,
        "points": 3,
        "instant_ban": False,
    },
    {
        "code": "RUN_RED",
        "name_en": "Running red light / stop sign",
        "name_ar": "تجاوز إشارة المرور الحمراء / علامة التوقف",
        "description": "Failure to stop at red light or stop sign",
        "default_severity": Severity.major,
        "points": 2,
        "instant_ban": False,
    },
    {
        "code": "WRONG_WAY",
        "name_en": "Driving wrong way / unauthorized route",
        "name_ar": "القيادة بالاتجاه المعاكس / مسار غير مصرح",
        "description": "Driving against traffic direction or off authorized routes",
        "default_severity": Severity.major,
        "points": 2,
        "instant_ban": False,
    },
    {
        "code": "DUI",
        "name_en": "Driving Under Influence",
        "name_ar": "القيادة تحت تأثير الكحول/المخدرات",
        "description": "Driving under the influence of alcohol or drugs",
        "default_severity": Severity.critical,
        "points": 10,
        "instant_ban": True,
    },
    {
        "code": "FATAL_ACCIDENT",
        "name_en": "Fatal / serious injury accident",
        "name_ar": "حادث مميت / إصابة خطيرة",
        "description": "Caused fatal or serious injury accident",
        "default_severity": Severity.critical,
        "points": 10,
        "instant_ban": True,
    },
    {
        "code": "EXPIRED_LICENSE",
        "name_en": "Expired driving license",
        "name_ar": "رخصة قيادة منتهية الصلاحية",
        "description": "Driver operating with expired license",
        "default_severity": Severity.major,
        "points": 2,
        "instant_ban": False,
    },
    {
        "code": "VEHICLE_DEFECT",
        "name_en": "Vehicle safety defect ignored",
        "name_ar": "تجاهل عيب سلامة في المركبة",
        "description": "Operating vehicle with known safety defect",
        "default_severity": Severity.major,
        "points": 2,
        "instant_ban": False,
    },
]


def seed_initial_data(db: Session) -> None:
    """Idempotent seed: creates admin if no users exist and inserts missing violation types."""
    # Admin bootstrap
    if db.query(User).count() == 0:
        admin = User(
            username=settings.BOOTSTRAP_ADMIN_USERNAME.lower(),
            full_name=settings.BOOTSTRAP_ADMIN_FULL_NAME,
            role=UserRole.admin,
            is_active=True,
            hashed_password=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
        )
        db.add(admin)

    # Violation types
    existing_codes = {row[0] for row in db.query(ViolationType.code).all()}
    for vt in SAMPLE_VIOLATION_TYPES:
        if vt["code"] not in existing_codes:
            db.add(ViolationType(**vt))

    db.commit()
