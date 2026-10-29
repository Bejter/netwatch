from sqlalchemy import Column, Float, ForeignKey, Integer, String, Boolean, DateTime
from datetime import datetime, timezone
from app.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    ip_address = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    status = Column(String, nullable=False)
    latency_ms = Column(Float, nullable=False)
    checked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))