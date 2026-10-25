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