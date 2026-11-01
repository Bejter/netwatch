import asyncio, ipaddress, socket

async def ping_device(ip: str, semaphore: asyncio.Semaphore) -> dict[str, str | None] | None:
    async with semaphore:
        try:
            proc = await asyncio.create_subprocess_exec(
                        "ping", "-c", "1", "-W", "1", ip,
                        stdout=asyncio.subprocess.DEVNULL,
                        stderr=asyncio.subprocess.DEVNULL
                    )
            await asyncio.wait_for(proc.communicate(), timeout=3)
        except asyncio.TimeoutError:
            if proc.returncode is None:
                proc.kill()
                await proc.wait()

            print(f"Timeout podczas pingowania {ip}")
            
            return None
        except OSError as e:
            print(f"Błąd pingowania {ip}: {e}")
            return None

        if proc.returncode == 0:
            try:
                device_name = await asyncio.wait_for(asyncio.to_thread(resolve_hostname, ip), timeout=2)
            except asyncio.TimeoutError:
                device_name = None
            return {"ip_address": ip, "detection_method": "icmp", "hostname": device_name}
        else:
            return None

async def scan_network(network: str):
    try:
        net = ipaddress.ip_network(network, strict=True)
    except ValueError as e:
        raise ValueError(f"Nieprawidłowa sieć: {e}")

    if net.num_addresses > 256:
        raise ValueError("Sieć jest zbyt duża. Maksymalna liczba adresów to 256.")

    allowed_network = ipaddress.ip_network("192.168.0.0/24")

    if net != allowed_network:
        raise ValueError(f"Niedozwolona podsieć: {net}")

    try:
        semaphore = asyncio.Semaphore(20)
        tasks = [ping_device(str(host), semaphore) for host in net.hosts()]
        results = await asyncio.gather(*tasks)
    except ValueError as e:
        raise ValueError(f"Error scanning network {network}: {e}")

    devices = [device for device in results if device is not None]

    return devices

def resolve_hostname(ip: str) -> str | None:
    
    try:
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except (socket.herror, OSError):
        return None