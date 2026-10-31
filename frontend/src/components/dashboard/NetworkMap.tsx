
import { useCallback, useEffect, useState } from "react";
import {
  Network,
  Monitor,
  RefreshCw,
  Router,
  Wifi,
} from "lucide-react";

interface Device {
  id: number;
  name: string;
  ip_address: string;
  is_active: boolean;
}

interface Measurement {
  id: number;
  status: string;
  latency_ms: number | null;
  checked_at: string;
}

interface NetworkDevice extends Device {
  status: "online" | "offline" | "unknown" | "inactive";
  latency: number | null;
}

const statusColors = {
  online: "#22C55E",
  offline: "#EF4444",
  unknown: "#A78BFA",
  inactive: "#71717A",
};

export default function NetworkMap() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [selected, setSelected] = useState<NetworkDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDevices = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/devices?limit=100&offset=0",
        { signal }
      );

      if (!response.ok) throw new Error("Błąd pobierania urządzeń");

      const deviceList: Device[] = await response.json();

      // Na mapie pokazujemy maksymalnie 8 urządzeń.
      const visibleDevices = deviceList.slice(0, 8);

      const results = await Promise.all(
        visibleDevices.map(async (device): Promise<NetworkDevice> => {
          if (!device.is_active) {
            return { ...device, status: "inactive", latency: null };
          }

          try {
            const res = await fetch(
              `/api/devices/${device.id}/measurements?limit=1&offset=0`,
              { signal }
            );

            if (!res.ok) throw new Error("Brak pomiarów");

            const measurements: Measurement[] = await res.json();
            const latest = measurements[0];

            let status: NetworkDevice["status"] = "unknown";

            if (latest?.status === "online") status = "online";
            if (latest?.status === "no_response") status = "offline";

            return {
              ...device,
              status,
              latency: latest?.latency_ms ?? null,
            };
          } catch (err) {
            if (signal.aborted) throw err;

            return { ...device, status: "unknown", latency: null };
          }
        })
      );

      if (!signal.aborted) {
        setDevices(results);
        setSelected((previous) =>
          results.find((device) => device.id === previous?.id) ?? null
        );
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error(err);
        setError("Nie udało się załadować mapy sieci.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadDevices(controller.signal);

    return () => controller.abort();
  }, [loadDevices, refreshKey]);

  // Rozmieszczenie urządzeń wokół centrum.
  const nodes = devices.map((device, index) => {
    const angle = (index / devices.length) * 2 * Math.PI - Math.PI / 2;

    return {
      ...device,
      x: 50 + 37 * Math.cos(angle),
      y: 50 + 36 * Math.sin(angle),
    };
  });

  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">

      {/* Nagłówek */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Mapa sieci
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Topologia logiczna monitorowanych urządzeń
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          aria-label="Odśwież mapę sieci"
          className="rounded-lg bg-violet-500/10 p-2 text-violet-400 transition hover:bg-violet-500/20 disabled:opacity-50"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading && (
        <p className="text-sm text-zinc-400">Ładowanie mapy...</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Obszar mapy */}
      <div className="relative h-[260px] w-full overflow-hidden rounded-xl border border-violet-500/10 bg-[#100E20]">

        {/* Linie połączeń */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {nodes.map((device) => (
            <line key={device.id} x1="50" y1="50" x2={device.x} y2={device.y} stroke={statusColors[device.status]} strokeWidth="0.35" strokeDasharray="1.5 1.5" opacity="0.65"/>
          ))}
        </svg>

        {/* Centrum sieci */}
        <div
          className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          style={{ left: "50%", top: "50%" }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-400 bg-violet-800/40 shadow-lg shadow-violet-600/30">
            <Router size={29} className="text-violet-200" />
          </div>

          <span className="text-xs font-semibold text-violet-200">
            Sieć lokalna
          </span>
        </div>

        {/* Urządzenia */}
        {nodes.map((device) => (
          <button
            key={device.id}
            type="button"
            onClick={() => setSelected(device)}
            title={`${device.name} – ${device.ip_address}`}
            className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${device.x}%`, top: `${device.y}%` }}
          >
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-[#26213F] transition-transform duration-200 group-hover:scale-110"
              style={{ borderColor: statusColors[device.status] }}
            >
              <Monitor size={20} className="text-zinc-200" />

              <span
                className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#100E20]"
                style={{ backgroundColor: statusColors[device.status] }}
              />
            </div>

            <span className="max-w-24 truncate rounded-md bg-[#100E20]/90 px-1.5 py-0.5 text-[11px] text-zinc-200">
              {device.name}
            </span>
          </button>
        ))}

        {devices.length === 0 && !loading && !error && (
          <div className="absolute inset-x-0 bottom-5 text-center text-xs text-zinc-500">
            Brak urządzeń do wyświetlenia
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="mt-5 flex flex-wrap gap-4">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs capitalize text-zinc-400">
              {status}
            </span>
          </div>
        ))}
      </div>

      {/* Wybrane urządzenie */}
      {selected && (
        <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2">
            <Network size={17} className="text-violet-400" />
            <h3 className="font-semibold text-white">
              {selected.name}
            </h3>
          </div>

          <div className="mt-3 space-y-2 text-sm text-zinc-400">
            <p>IP: {selected.ip_address}</p>

            <p>
              Status:{" "}
              <span style={{ color: statusColors[selected.status] }}>
                {selected.status}
              </span>
            </p>

            <p>
              Ping:{" "}
              {selected.latency !== null
                ? `${selected.latency} ms`
                : "Brak danych"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
        <Wifi size={14} />
        <span>Wyświetlono {devices.length} urządzeń</span>
      </div>
    </div>
  );
}
