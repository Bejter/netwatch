import asyncio
from app.services.monitoring.monitor_service import monitor_devices

async def run_worker():

    while True:
        # Call the monitor_devices function from the monitor_service module
        await monitor_devices()
        
        # Wait for a specified interval before running again (e.g., 60 seconds)
        await asyncio.sleep(30)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        print("NetWatch worker stopped.")