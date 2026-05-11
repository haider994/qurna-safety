"""Pydantic schemas for request/response."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import DriverStatus, Severity, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class LoginIn(BaseModel):
    username: str
    password: str


# ---------- Users ----------
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: str = ""
    role: UserRole = UserRole.viewer
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ---------- Contractors ----------
class ContractorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    name_ar: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None
    is_active: bool = True
    is_blacklisted: bool = False


class ContractorCreate(ContractorBase):
    pass


class ContractorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=160)
    name_ar: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    is_blacklisted: Optional[bool] = None


class ContractorOut(ContractorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    driver_count: int = 0
    violating_driver_count: int = 0
    total_violations: int = 0


# ---------- Drivers ----------
class DriverBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=160)
    full_name_ar: Optional[str] = None
    national_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    defensive_driving_expiry: Optional[datetime] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    contractor_id: Optional[int] = None
    is_active: bool = True


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=160)
    full_name_ar: Optional[str] = None
    national_id: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[datetime] = None
    defensive_driving_expiry: Optional[datetime] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    contractor_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_blacklisted: Optional[bool] = None
    status: Optional[DriverStatus] = None


class DriverOut(DriverBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: DriverStatus
    is_blacklisted: bool
    created_at: datetime
    violation_count: int = 0
    contractor_name: Optional[str] = None


# ---------- Violation Types ----------
class ViolationTypeBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=40)
    name_en: str = Field(..., min_length=1, max_length=120)
    name_ar: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    default_severity: Severity = Severity.minor
    points: int = Field(1, ge=1, le=100)
    instant_ban: bool = False
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper().replace(" ", "_")


class ViolationTypeCreate(ViolationTypeBase):
    pass


class ViolationTypeUpdate(BaseModel):
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    default_severity: Optional[Severity] = None
    points: Optional[int] = Field(None, ge=1, le=100)
    instant_ban: Optional[bool] = None
    is_active: Optional[bool] = None


class ViolationTypeOut(ViolationTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ---------- Violations ----------
class ViolationBase(BaseModel):
    driver_id: int
    violation_type_id: int
    severity: Optional[Severity] = None  # defaults from type
    occurred_at: datetime
    location: Optional[str] = None
    vehicle_plate: Optional[str] = None
    speed_kmh: Optional[float] = None
    description: Optional[str] = None
    attachment_url: Optional[str] = None
    reported_by: Optional[str] = None


class ViolationCreate(ViolationBase):
    pass


class ViolationUpdate(BaseModel):
    severity: Optional[Severity] = None
    occurred_at: Optional[datetime] = None
    location: Optional[str] = None
    vehicle_plate: Optional[str] = None
    speed_kmh: Optional[float] = None
    description: Optional[str] = None
    attachment_url: Optional[str] = None
    reported_by: Optional[str] = None


class ViolationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    driver_id: int
    driver_name: Optional[str] = None
    contractor_id: Optional[int] = None
    contractor_name: Optional[str] = None
    violation_type_id: int
    violation_type_code: Optional[str] = None
    violation_type_name_en: Optional[str] = None
    violation_type_name_ar: Optional[str] = None
    severity: Severity
    occurred_at: datetime
    location: Optional[str] = None
    vehicle_plate: Optional[str] = None
    speed_kmh: Optional[float] = None
    description: Optional[str] = None
    attachment_url: Optional[str] = None
    reported_by: Optional[str] = None
    triggered_status: Optional[DriverStatus] = None
    created_at: datetime


# ---------- Dashboard ----------
class DashboardStats(BaseModel):
    total_drivers: int
    total_contractors: int
    total_violations: int
    violations_today: int
    violations_this_week: int
    violations_this_month: int
    active_drivers: int
    banned_drivers: int
    suspended_drivers: int
    warning_drivers: int
    notice_drivers: int


class TimeBucket(BaseModel):
    bucket: str
    count: int


class TopItem(BaseModel):
    id: int
    name: str
    count: int
    extra: Optional[str] = None


class SeverityBreakdown(BaseModel):
    minor: int
    major: int
    critical: int


class ContractorRisk(BaseModel):
    contractor_id: int
    contractor_name: str
    driver_count: int
    violating_driver_count: int
    violating_percent: float
    total_violations: int
    is_risk: bool


class DashboardData(BaseModel):
    stats: DashboardStats
    violations_by_day: list[TimeBucket]
    violations_by_type: list[TopItem]
    top_drivers: list[TopItem]
    top_contractors: list[TopItem]
    severity_breakdown: SeverityBreakdown
    contractor_risk: list[ContractorRisk]


# ---------- Audit ----------
class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime


Token.model_rebuild()
