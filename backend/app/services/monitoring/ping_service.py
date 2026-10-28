import ipaddress, asyncio

#funkcja pingująca hosta i zwracająca jego status oraz opóźnienie w ms
async def ping_host(ip_address: str):
    ipaddress.ip_address(ip_address)

    try:
        process = await asyncio.wait_for(
            asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "2", ip_address,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            ),
            timeout=4
        )

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=4)
        except TimeoutError:
            if process.returncode is None:
                process.kill()

            await process.communicate()

            return {
                "ip_address": ip_address,
                "status": "error",
                "latency_ms": None
            }

        output = stdout.decode("utf-8", errors = "replace")        

        if process.returncode == 0:
            # Znajdujemy fragment po "time="
            latency = output.split("time=")[1]

            # Odcinamy wszystko po liczbie
            latency = latency.split(" ")[0]

            return {
                "ip_address": ip_address,
                "status": "online",
                "latency_ms": float(latency)
            }

        elif process.returncode == 1:
            return {
                "ip_address": ip_address,
                "status": "no_response",
                "latency_ms": None
            }

        else:
            return {
                "ip_address": ip_address,
                "status": "error",
                "latency_ms": None
            }

    except (TimeoutError, OSError, IndexError, ValueError):
        return {
            "ip_address": ip_address,
            "status": "error",
            "latency_ms": None
        }


async def ping_multiple(ip_addresses: list):
    semaphore = asyncio.Semaphore(20)  # Limit to 20 concurrent pings
    async def ping_with_semaphore(ip):
        async with semaphore:
            return await ping_host(ip)
    tasks = [ping_with_semaphore(ip) for ip in ip_addresses]
    results = await asyncio.gather(*tasks)
    return results


if __name__ == "__main__":
    print(asyncio.run(ping_multiple(["192.168.0.1", "8.8.8.8"])))
