from app.database import SessionLocal
from app.models import Device, Measurement
from app.services.monitoring.ping_service import ping_multiple
import asyncio

async def monitor_devices():

    db = SessionLocal()

    #pobieranie urządzeń z bazy danych
    try:
        devices = db.query(Device).filter(Device.is_active == True).all()

        devices_data = [
            {
                "id": device.id,
                "ip_address": device.ip_address
            }
            for device in devices
        ]
    except Exception as e:
        print(f"Error fetching devices: {e}")
        return
    finally:
        db.close()

    devices_ip = [device["ip_address"] for device in devices_data]

    #pingowanie urządzeń
    pinged_devices = await ping_multiple(devices_ip)

    db = SessionLocal()

    #zapis wyników do bazy danych
    try:
        for device, result in zip(devices_data, pinged_devices):
            measurement = Measurement(
                device_id = device["id"],
                status = result["status"],
                latency_ms = result["latency_ms"] 
            )
            db.add(measurement)
            
        db.commit()
        print("Measurements saved successfully!")
    except Exception as e:
        print(f"Error saving measurements: {e}")
        db.rollback()
    finally:
        db.close()

    print(f"Found {len(devices_data)} active devices")
    print(f"Ping results: {pinged_devices}")


if __name__ == "__main__":
    asyncio.run(monitor_devices())