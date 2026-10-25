from fastapi import FastAPI
from app.database import engine, Base
from app.models import Device

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "healthy"}