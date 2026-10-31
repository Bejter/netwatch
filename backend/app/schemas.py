from pydantic import BaseModel, ConfigDict, IPvAnyAddress
from datetime import datetime

class DeviceCreate(BaseModel):
    name: str
    ip_address: IPvAnyAddress
    is_active: bool = True

class DeviceResponse(BaseModel):
    id: int
    name: str
    ip_address: IPvAnyAddress
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes = True)

class MeasurementResponse(BaseModel):
    id: int
    device_id: int
    status: str
    latency_ms: float | None
    checked_at: datetime

    model_config = ConfigDict(from_attributes = True)

class DashboardSummaryResponse(BaseModel):
    total_devices: int
    active_devices: int
    online_devices: int
    offline_devices: int
    unknown_devices: int