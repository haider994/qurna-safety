"""Audit logging helper."""
from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog, User


def log_action(
    db: Session,
    user: User | None,
    action: str,
    entity_type: str,
    entity_id: int | str | None = None,
    details: str | None = None,
    request: Request | None = None,
) -> None:
    """Insert an audit log row. Caller is responsible for commit (or rollback)."""
    ip = None
    if request is not None:
        # Trust X-Forwarded-For when behind a proxy (Fly sets this)
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            ip = fwd.split(",")[0].strip()
        elif request.client:
            ip = request.client.host
    entry = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        ip_address=ip,
    )
    db.add(entry)
