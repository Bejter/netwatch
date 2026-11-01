import datetime
from fastapi import FastAPI, HTTPException, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal, engine, Base
from app.models import Device as DeviceModel, Measurement
from app.schemas import DashboardSummaryResponse, DeviceCreate, NetworkScanRequest
from app.schemas import  MeasurementResponse, EventResponse
from app.services.discovery.scanner import scan_network

Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/devices")
def create_device(device: DeviceCreate, db: Session = Depends(get_db)):

    db_device = DeviceModel(
        name=device.name, 
        ip_address=str(device.ip_address), 
        is_active=device.is_active
        )

    if db.query(DeviceModel).filter(DeviceModel.ip_address == db_device.ip_address).first():
        raise HTTPException(status_code=400, detail="IP address already registered")
    
    db.add(db_device)
    db.commit()
    db.refresh(db_device)

    return db_device

@app.get("/devices")
def get_devices(is_active: bool = None, limit: int = 10, offset: int = 0, db: Session = Depends(get_db)):

    if is_active is not None:
        devices = db.query(DeviceModel).filter(DeviceModel.is_active == is_active).order_by(DeviceModel.id).offset(offset).limit(limit).all()
    else:
        devices = db.query(DeviceModel).order_by(DeviceModel.id).offset(offset).limit(limit).all()
    
    return devices

@app.get("/devices/{device_id}")
def get_device(device_id: int, db: Session = Depends(get_db)):

    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

    if device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return device

@app.put("/devices/{device_id}")
def update_device(device_id: int, device: DeviceCreate, db: Session = Depends(get_db)):

    db_device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_device.name = device.name
    db_device.ip_address = str(device.ip_address)
    db_device.is_active = device.is_active

    db.commit()
    db.refresh(db_device)

    return db_device


@app.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):

    db_device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(db_device)
    db.commit()

    return {"detail": "Device deleted successfully"}

@app.get("/devices/{device_id}/measurements", response_model=list[MeasurementResponse])
def get_device_measurements(device_id: int, limit: int = 10, offset: int = 0, db: Session = Depends(get_db)):
    db_device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    measurements = db.query(Measurement).filter(Measurement.device_id == device_id).order_by(Measurement.checked_at.desc()).offset(offset).limit(limit).all()

    return measurements


@app.get("/devices/{device_id}/stats")
def get_device_stats(device_id: int, hours: int | None = Query(default=None, ge=1, le=720), db: Session = Depends(get_db)):
    db_device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")

    query = db.query(Measurement).filter(Measurement.device_id == device_id)

    if hours is not None:
        time_threshold = datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
        query = query.filter(Measurement.checked_at >= time_threshold)

    total_measurements = query.count()

    successful_query = query.filter(Measurement.status == "online")
    successful_measurements = successful_query.count()
    availability_percentage = (successful_measurements / total_measurements * 100 if total_measurements > 0 else None)
    avg_latency_ms = successful_query.with_entities(func.avg(Measurement.latency_ms)).scalar()
    min_latency_ms = successful_query.with_entities(func.min(Measurement.latency_ms)).scalar()
    max_latency_ms = successful_query.with_entities(func.max(Measurement.latency_ms)).scalar()

    return {
        "device_id": device_id,
        "total_measurements": total_measurements,
        "successful_measurements": successful_measurements,
        "availability_percentage": availability_percentage,
        "avg_latency_ms": avg_latency_ms,
        "min_latency_ms": min_latency_ms,
        "max_latency_ms": max_latency_ms
    }


@app.get("/dashboard/summary",response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):

    total_devices = db.query(DeviceModel).count()
    active_devices = db.query(DeviceModel).filter(DeviceModel.is_active == True).all()

    online_devices = 0
    offline_devices = 0
    unknown_devices = 0

    for device in active_devices:

        last_measurement = db.query(Measurement).filter(Measurement.device_id == device.id).order_by(Measurement.checked_at.desc(),Measurement.id.desc()).first()

        if last_measurement is None:
            unknown_devices += 1

        elif last_measurement.status == "online":
            online_devices += 1

        elif last_measurement.status == "no_response":
            offline_devices += 1
            
        else:
            unknown_devices += 1

    return {
        "total_devices": total_devices,
        "active_devices": len(active_devices),
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "unknown_devices": unknown_devices
    }

@app.get("/events/recent", response_model=list[EventResponse])
def get_recent_events(limit: int = Query(default=10, ge=1, le=100), offset: int = Query(default=0, ge=0), db: Session = Depends(get_db),):

    measurements = (db.query(Measurement, DeviceModel).join(DeviceModel, Measurement.device_id == DeviceModel.id).order_by(Measurement.checked_at.asc(), Measurement.id.asc()).all())

    previous_statuses = {}
    events = []

    for measurement, device in measurements:

        device_id = measurement.device_id
        current_status = measurement.status

        if device_id not in previous_statuses:
            if current_status in ("online", "no_response"):
                previous_statuses[device_id] = current_status
            continue

        if current_status not in ("online", "no_response"):
            continue

        previous_status = previous_statuses[device_id]

        if previous_status == current_status:
            continue

        if current_status == "online":
            event_status = "online"
            description = "Połączenie przywrócone"
        else:
            event_status = "offline"
            description = "Utracono połączenie"

        events.append(
            EventResponse(
                id=measurement.id,
                device_id=device.id,
                device_name=device.name,
                status=event_status,
                description=description,
                created_at=measurement.checked_at,
            )
        )

        previous_statuses[device_id] = current_status

    events.reverse()

    return events[offset:offset + limit]


@app.post("/network/discover")
async def discover_network(request: NetworkScanRequest):
    try:
        devices = await scan_network(request.network)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"discovered_devices": devices}