
import { useEffect, useState } from "react";
import {
  Activity,
  Clock3,
  Monitor,
  RefreshCw,
  Wifi,
  WifiOff,
  CircleHelp,
  PauseCircle,
  ChevronRight,
} from "lucide-react";

import DeviceMonitoringDetails from "../components/monitoring/DeviceMonitoringDetails";

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

type DeviceStatus =
  | "online"
  | "offline"
  | "unknown"
  | "inactive";

interface MonitoredDevice extends Device {
  status: DeviceStatus;
  latency: number | null;
  checkedAt: string | null;
}

const statusConfig = {
  online: {
    label: "Online",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: Wifi,
  },
  offline: {
    label: "Offline",
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: WifiOff,
  },
  unknown: {
    label: "Nieznany",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    icon: CircleHelp,
  },
  inactive: {
    label: "Wyłączony",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    icon: PauseCircle,
  },
};

export default function MonitoringPage() {
  const [devices, setDevices] = useState<MonitoredDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter, setFilter] = useState("all");

  // Urządzenie wybrane do szczegółowej diagnostyki.
  const [selectedDeviceId, setSelectedDeviceId] =
    useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;

    async function loadMonitoring() {
      if (fetching || controller.signal.aborted) return;

      fetching = true;

      try {
        const response = await fetch(
          "/api/devices?limit=100&offset=0",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const deviceList: Device[] = await response.json();

        const results = await Promise.all(
          deviceList.map(
            async (device): Promise<MonitoredDevice> => {
              // Monitoring wyłączony.
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
                  { signal: controller.signal }
                );

                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}`);
                }

                const measurements: Measurement[] =
                  await res.json();

                const latest = measurements[0];

                let status: DeviceStatus = "unknown";

                if (latest?.status === "online") {
                  status = "online";
                } else if (latest?.status === "no_response") {
                  status = "offline";
                }

                return {
                  ...device,
                  status,
                  latency: latest?.latency_ms ?? null,
                  checkedAt: latest?.checked_at ?? null,
                };
              } catch (err) {
                if (controller.signal.aborted) throw err;

                console.error(
                  `Błąd pomiaru urządzenia ${device.id}:`,
                  err
                );

                return {
                  ...device,
                  status: "unknown",
                  latency: null,
                  checkedAt: null,
                };
              }
            }
          )
        );

        if (!controller.signal.aborted) {
          setDevices(results);
          setLastUpdate(new Date());
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Błąd monitoringu:", err);
          setError("Nie udało się pobrać danych monitoringu.");
        }
      } finally {
        fetching = false;

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadMonitoring();

    // Odświeżanie danych co 30 sekund.
    const interval = window.setInterval(() => {
      void loadMonitoring();
    }, 30000);

    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [refreshKey]);

  const monitored = devices.filter((d) => d.is_active);

  const online = monitored.filter(
    (d) => d.status === "online"
  ).length;

  const offline = monitored.filter(
    (d) => d.status === "offline"
  ).length;

  const unknown = monitored.filter(
    (d) => d.status === "unknown"
  ).length;

  const selectedDevice = devices.find(
    (device) => device.id === selectedDeviceId
  );

  const filteredDevices = devices.filter((device) => {
    if (filter === "all") return true;
    if (filter === "active") return device.is_active;
    return device.status === filter;
  });

  const formatLatency = (latency: number | null) => {
    if (latency === null) return "—";
    return `${latency.toFixed(2)} ms`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Brak pomiaru";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Nieprawidłowa data";
    }

    return parsed.toLocaleString("pl-PL");
  };

  return (
    <div className="space-y-5">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Monitoring
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Aktualna dostępność urządzeń w sieci
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[#342B4E] bg-[#1D1930] px-4 py-2.5 text-sm text-violet-300 transition hover:bg-[#26213F] disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? "animate-spin" : ""}
          />
          Odśwież
        </button>
      </div>

      {/* Karty statystyk */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Monitorowane",
            value: monitored.length,
            color: "text-violet-400",
            icon: Monitor,
          },
          {
            label: "Online",
            value: online,
            color: "text-emerald-400",
            icon: Wifi,
          },
          {
            label: "Offline",
            value: offline,
            color: "text-red-400",
            icon: WifiOff,
          },
          {
            label: "Nieznany status",
            value: unknown,
            color: "text-amber-400",
            icon: CircleHelp,
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  {stat.label}
                </p>

                <Icon size={19} className={stat.color} />
              </div>

              <p
                className={`mt-3 text-3xl font-bold ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Lista urządzeń */}
      <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Monitorowane urządzenia
            </h2>

            <p className="mt-1 text-xs text-zinc-400">
              Ostatnie wyniki pomiarów ICMP
            </p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
          >
            <option value="all">Wszystkie</option>
            <option value="active">Monitoring włączony</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="unknown">Nieznane</option>
            <option value="inactive">Wyłączone</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && devices.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            Ładowanie urządzeń...
          </p>
        )}

        <div className="space-y-3">
          {filteredDevices.map((device) => {
            const config = statusConfig[device.status];
            const StatusIcon = config.icon;
            const isSelected = selectedDeviceId === device.id;

            return (
              <div
                key={device.id}
                className={`flex flex-wrap items-center gap-4 rounded-xl border bg-[#100E20] p-4 transition ${
                  isSelected
                    ? "border-violet-500/60"
                    : "border-[#342B4E] hover:border-violet-500/30"
                }`}
              >
                <div className="rounded-xl bg-violet-500/10 p-3">
                  <Monitor
                    size={21}
                    className="text-violet-400"
                  />
                </div>

                <div className="min-w-40 flex-1">
                  <p className="font-medium text-white">
                    {device.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    {device.ip_address}
                  </p>
                </div>

                <div className="min-w-24">
                  <p className="text-xs text-zinc-500">
                    Opóźnienie
                  </p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {formatLatency(device.latency)}
                  </p>
                </div>

                <div className="min-w-36">
                  <p className="text-xs text-zinc-500">
                    Ostatni pomiar
                  </p>

                  <p className="mt-1 text-xs text-zinc-300">
                    {formatDate(device.checkedAt)}
                  </p>
                </div>

                <span
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${config.bg} ${config.color}`}
                >
                  <StatusIcon size={15} />
                  {config.label}
                </span>

                {/* Otwieranie szczegółów */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDeviceId(
                      isSelected ? null : device.id
                    )
                  }
                  className={`flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-medium transition ${
                    isSelected
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                  }`}
                >
                  {isSelected ? "Zamknij" : "Szczegóły"}

                  <ChevronRight
                    size={15}
                    className={
                      isSelected ? "rotate-90" : ""
                    }
                  />
                </button>
              </div>
            );
          })}
        </div>

        {!loading && !error && filteredDevices.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            Brak urządzeń spełniających kryteria.
          </p>
        )}
      </div>

      {/* Panel szczegółowej diagnostyki */}
      {selectedDevice && (
        <DeviceMonitoringDetails
          key={selectedDevice.id}
          deviceId={selectedDevice.id}
          deviceName={selectedDevice.name}
          ipAddress={selectedDevice.ip_address}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}

      {/* Stopka */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Activity size={15} />
          Monitoring ICMP
        </div>

        <div className="flex items-center gap-2">
          <Clock3 size={15} />
          Ostatnie pobranie:{" "}
          {lastUpdate
            ? lastUpdate.toLocaleTimeString("pl-PL")
            : "Brak"}
        </div>
      </div>
    </div>
  );
}
