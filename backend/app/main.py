from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import Device as DeviceModel
from app.schemas import DeviceCreate

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

@app.post("/devices/")
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

@app.get("/devices/")
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