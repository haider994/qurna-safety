"""SQLAlchemy ORM models."""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    admin = "admin"
    data_entry = "data_entry"
    viewer = "viewer"


class DriverStatus(str, enum.Enum):
    active = "active"
    notice = "notice"
    warning = "warning"
    suspended = "suspended"
    banned = "banned"


class Severity(str, enum.Enum):
    minor = "minor"
    major = "major"
    critical = "critical"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.viewer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Contractor(Base):
    __tablename__ = "contractors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    name_ar: Mapped[str | None] = mapped_column(String(160), nullable=True)
    contact_person: Mapped[str | None] = mapped_column(String(120), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    drivers: Mapped[list["Driver"]] = relationship(back_populates="contractor")


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    full_name_ar: Mapped[str | None] = mapped_column(String(160), nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(60), unique=True, nullable=True, index=True)
    license_number: Mapped[str | None] = mapped_column(String(60), unique=True, nullable=True, index=True)
    license_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    defensive_driving_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(80), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    contractor_id: Mapped[int | None] = mapped_column(ForeignKey("contractors.id", ondelete="SET NULL"), nullable=True, index=True)
    contractor: Mapped[Contractor | None] = relationship(back_populates="drivers")

    status: Mapped[DriverStatus] = mapped_column(SAEnum(DriverStatus), default=DriverStatus.active, nullable=False, index=True)
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    violations: Mapped[list["Violation"]] = relationship(back_populates="driver", cascade="all, delete-orphan")


class ViolationType(Base):
    __tablename__ = "violation_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_severity: Mapped[Severity] = mapped_column(SAEnum(Severity), default=Severity.minor, nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # If true, a single occurrence triggers immediate ban regardless of count
    instant_ban: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True)
    driver: Mapped[Driver] = relationship(back_populates="violations")

    violation_type_id: Mapped[int] = mapped_column(ForeignKey("violation_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    violation_type: Mapped[ViolationType] = relationship()

    severity: Mapped[Severity] = mapped_column(SAEnum(Severity), default=Severity.minor, nullable=False, index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vehicle_plate: Mapped[str | None] = mapped_column(String(40), nullable=True)
    speed_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    reported_by: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Snapshots so we can show what happened after the violation
    triggered_status: Mapped[DriverStatus | None] = mapped_column(SAEnum(DriverStatus), nullable=True)

    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username: Mapped[str | None] = mapped_column(String(80), nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
