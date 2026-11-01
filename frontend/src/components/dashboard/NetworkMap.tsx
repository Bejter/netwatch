
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Monitor,
  Network,
  RefreshCw,
  Router,
  Wifi,
  X,
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
  checkedAt: string | null;
}

interface NetworkMapProps {
  fullPage?: boolean;
}

const statusColors = {
  online: "#22C55E",
  offline: "#EF4444",
  unknown: "#A78BFA",
  inactive: "#71717A",
};

const statusLabels = {
  online: "Online",
  offline: "Offline",
  unknown: "Nieznany",
  inactive: "Monitoring wyłączony",
};

export default function NetworkMap({
  fullPage = false,
}: NetworkMapProps) {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [selected, setSelected] = useState<NetworkDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadDevices = useCallback(async (signal: AbortSignal) => {
    setError(null);

    try {
      const response = await fetch(
        "/api/devices?limit=100&offset=0",
        { signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const deviceList: Device[] = await response.json();

      // Na dashboardzie maksymalnie 8 urządzeń.
      // Na pełnej stronie maksymalnie 24.
      const visibleDevices = deviceList.slice(0, fullPage ? 24 : 8);

      const results = await Promise.all(
        visibleDevices.map(async (device): Promise<NetworkDevice> => {
          if (!device.is_active) {
            return {
              ...device,
              status: "inactive",
              latency: null,
              checkedAt: null,
            };
          }

          try {
            const res = await fetch(
              `/api/devices/${device.id}/measurements?limit=1&offset=0`,
              { signal }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const measurements: Measurement[] = await res.json();
            const latest = measurements[0];

            let status: NetworkDevice["status"] = "unknown";

            if (latest?.status === "online") status = "online";
            if (latest?.status === "no_response") status = "offline";

            return {
              ...device,
              status,
              latency: latest?.latency_ms ?? null,
              checkedAt: latest?.checked_at ?? null,
            };
          } catch (err) {
            if (signal.aborted) throw err;

            console.error(
              `Błąd pobierania pomiarów urządzenia ${device.id}:`,
              err
            );

            return {
              ...device,
              status: "unknown",
              latency: null,
              checkedAt: null,
            };
          }
        })
      );

      if (!signal.aborted) {
        setDevices(results);
        setSelected((previous) =>
          results.find((device) => device.id === previous?.id) ?? null
        );
        setLastRefresh(new Date());
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error("Błąd mapy sieci:", err);
        setError("Nie udało się pobrać danych mapy sieci.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [fullPage]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    void loadDevices(controller.signal);

    // Odświeżanie co 30 sekund.
    const interval = window.setInterval(() => {
      if (!controller.signal.aborted) {
        void loadDevices(controller.signal);
      }
    }, 30000);

    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [loadDevices, refreshKey]);

  // Rozmieszczenie urządzeń w okręgach.
  const nodes = devices.map((device, index) => {
    const total = devices.length;
    const innerCount = fullPage ? 8 : total;
    const isOuter = fullPage && index >= innerCount;

    const indexInRing = isOuter ? index - innerCount : index;
    const countInRing = isOuter ? total - innerCount : Math.min(total, innerCount);

    const angle =
      (indexInRing / countInRing) * 2 * Math.PI - Math.PI / 2;

    const radiusX = isOuter ? 44 : fullPage ? 27 : 37;
    const radiusY = isOuter ? 42 : fullPage ? 26 : 36;

    return {
      ...device,
      x: 50 + radiusX * Math.cos(angle),
      y: 50 + radiusY * Math.sin(angle),
    };
  });

  const onlineCount = devices.filter(
    (device) => device.status === "online"
  ).length;

  const offlineCount = devices.filter(
    (device) => device.status === "offline"
  ).length;

  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
      {/* Nagłówek */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {fullPage ? "Topologia sieci" : "Mapa sieci"}
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            Logiczna mapa monitorowanych urządzeń
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          title="Odśwież mapę"
          className="rounded-xl bg-violet-500/10 p-2 text-violet-400 transition hover:bg-violet-500/20 disabled:opacity-50"
        >
          <RefreshCw
            size={19}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Liczniki */}
      {fullPage && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#100E20] p-4">
            <p className="text-xs text-zinc-400">Urządzenia na mapie</p>
            <p className="mt-2 text-2xl font-bold text-violet-400">
              {devices.length}
            </p>
          </div>

          <div className="rounded-xl bg-[#100E20] p-4">
            <p className="text-xs text-zinc-400">Online</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {onlineCount}
            </p>
          </div>

          <div className="rounded-xl bg-[#100E20] p-4">
            <p className="text-xs text-zinc-400">Offline</p>
            <p className="mt-2 text-2xl font-bold text-red-400">
              {offlineCount}
            </p>
          </div>
        </div>
      )}

      {loading && devices.length === 0 && (
        <p className="mb-3 text-sm text-zinc-400">
          Ładowanie mapy...
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Obszar mapy */}
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-violet-500/10 bg-[#100E20] ${
          fullPage ? "h-[560px]" : "h-[320px]"
        }`}
      >
        {/* Tło w kratkę */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#A855F7 1px, transparent 1px), linear-gradient(90deg, #A855F7 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Linie połączeń */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {nodes.map((device) => (
            <line
              key={device.id}
              x1="50"
              y1="50"
              x2={device.x}
              y2={device.y}
              stroke={statusColors[device.status]}
              strokeWidth="0.3"
              strokeDasharray="1.5 1.5"
              opacity="0.65"
            />
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
            style={{
              left: `${device.x}%`,
              top: `${device.y}%`,
            }}
          >
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-full border bg-[#26213F] transition-transform duration-200 group-hover:scale-110"
              style={{
                borderColor: statusColors[device.status],
              }}
            >
              <Monitor size={20} className="text-zinc-200" />

              <span
                className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#100E20]"
                style={{
                  backgroundColor: statusColors[device.status],
                }}
              />
            </div>

            <span className="max-w-24 truncate rounded-md bg-[#100E20]/90 px-1.5 py-0.5 text-[11px] text-zinc-200">
              {device.name}
            </span>
          </button>
        ))}

        {devices.length === 0 && !loading && !error && (
          <div className="absolute inset-x-0 bottom-6 text-center text-sm text-zinc-500">
            Brak monitorowanych urządzeń
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

            <span className="text-xs text-zinc-400">
              {statusLabels[status as keyof typeof statusLabels]}
            </span>
          </div>
        ))}
      </div>

      {/* Panel szczegółów */}
      {selected && (
        <div className="mt-5 rounded-xl border border-violet-500/20 bg-[#100E20] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network size={18} className="text-violet-400" />

              <h3 className="font-semibold text-white">
                {selected.name}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Zamknij szczegóły"
              className="text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-500">Adres IP</p>
              <p className="mt-1 text-white">{selected.ip_address}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p
                className="mt-1 font-medium"
                style={{ color: statusColors[selected.status] }}
              >
                {statusLabels[selected.status]}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Opóźnienie</p>
              <p className="mt-1 text-white">
                {selected.latency !== null
                  ? `${selected.latency.toFixed(2)} ms`
                  : "Brak danych"}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Ostatni pomiar</p>
              <p className="mt-1 text-white">
                {selected.checkedAt
                  ? new Date(selected.checkedAt).toLocaleString("pl-PL")
                  : "Brak danych"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stopka */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Wifi size={14} />
          <span>Wyświetlono {devices.length} urządzeń</span>
        </div>

        <div className="flex items-center gap-2">
          <Activity size={14} />
          <span>
            Ostatnie odświeżenie:{" "}
            {lastRefresh
              ? lastRefresh.toLocaleTimeString("pl-PL")
              : "Brak"}
          </span>
        </div>
      </div>
    </div>
  );
}
