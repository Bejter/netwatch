
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  Clock3,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Device {
  id: number;
  name: string;
  ip_address: string;
  is_active: boolean;
}

interface Measurement {
  id: number;
  device_id: number;
  status: string;
  latency_ms: number | null;
  checked_at: string;
}

const periods = [
  { label: "1 godzina", hours: 1 },
  { label: "6 godzin", hours: 6 },
  { label: "24 godziny", hours: 24 },
  { label: "7 dni", hours: 168 },
];

const PAGE_SIZE = 100;
const MAX_MEASUREMENTS = 3000;

export default function ChartsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hours, setHours] = useState(24);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [historyLimited, setHistoryLimited] = useState(false);

  // Pobieranie urządzeń
  useEffect(() => {
    const controller = new AbortController();

    async function loadDevices() {
      try {
        const response = await fetch(
          "/api/devices?limit=100&offset=0",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Device[] = await response.json();

        if (controller.signal.aborted) return;

        setDevices(data);

        setSelectedId((previous) => {
          if (data.some((device) => device.id === previous)) {
            return previous;
          }

          return data[0]?.id ?? null;
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError("Nie udało się pobrać listy urządzeń.");
          setLoading(false);
        }
      }
    }

    void loadDevices();

    return () => controller.abort();
  }, []);

  // Pobieranie historii z paginacją
  useEffect(() => {
    if (selectedId === null) {
      setMeasurements([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let fetching = false;

    async function loadMeasurements() {
      if (fetching || controller.signal.aborted) return;

      fetching = true;

      try {
        const cutoff = Date.now() - hours * 60 * 60 * 1000;

        const all: Measurement[] = [];
        let offset = 0;
        let reachedBeginning = false;

        while (
          offset < MAX_MEASUREMENTS &&
          !controller.signal.aborted
        ) {
          const response = await fetch(
            `/api/devices/${selectedId}/measurements?limit=${PAGE_SIZE}&offset=${offset}`,
            { signal: controller.signal }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const batch: Measurement[] = await response.json();

          if (!Array.isArray(batch)) {
            throw new Error("Nieprawidłowy format pomiarów");
          }

          const withinPeriod = batch.filter(
            (item) =>
              new Date(item.checked_at).getTime() >= cutoff
          );

          all.push(...withinPeriod);

          // Endpoint powinien zwracać najnowsze pomiary
          // jako pierwsze.
          const oldest = batch[batch.length - 1];

          if (
            batch.length < PAGE_SIZE ||
            (oldest &&
              new Date(oldest.checked_at).getTime() < cutoff)
          ) {
            reachedBeginning = true;
            break;
          }

          offset += batch.length;
        }

        if (controller.signal.aborted) return;

        setMeasurements(all);
        setHistoryLimited(!reachedBeginning);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError("Nie udało się pobrać historii pomiarów.");
        }
      } finally {
        fetching = false;

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    setMeasurements([]);
    setHistoryLimited(false);
    setLoading(true);
    setError(null);

    void loadMeasurements();

    const interval = window.setInterval(() => {
      void loadMeasurements();
    }, 30000);

    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [selectedId, hours, refreshKey]);

  // Sortowanie i statystyki
  const analysis = useMemo(() => {
    const sorted = [...measurements].sort(
      (a, b) =>
        new Date(a.checked_at).getTime() -
          new Date(b.checked_at).getTime() ||
        a.id - b.id
    );

    const online = sorted.filter(
      (m) => m.status === "online"
    );

    const offline = sorted.filter(
      (m) => m.status === "no_response"
    );

    const validCount = online.length + offline.length;

    const latencies = online
      .map((m) => m.latency_ms)
      .filter((v): v is number => v !== null);

    const average = latencies.length
      ? latencies.reduce((sum, v) => sum + v, 0) /
        latencies.length
      : null;

    const minimum = latencies.length
      ? Math.min(...latencies)
      : null;

    const maximum = latencies.length
      ? Math.max(...latencies)
      : null;

    let outages = 0;
    let previousStatus: string | null = null;

    for (const measurement of sorted) {
      if (
        measurement.status !== "online" &&
        measurement.status !== "no_response"
      ) {
        continue;
      }

      if (
        previousStatus === "online" &&
        measurement.status === "no_response"
      ) {
        outages++;
      }

      previousStatus = measurement.status;
    }

    const chartData = sorted.map((m) => ({
      id: m.id,
      timestamp: new Date(m.checked_at).getTime(),
      latency:
        m.status === "online" ? m.latency_ms : null,
      status: m.status,
    }));

    return {
      sorted,
      chartData,
      onlineCount: online.length,
      offlineCount: offline.length,
      availability: validCount
        ? (online.length / validCount) * 100
        : null,
      average,
      minimum,
      maximum,
      outages,
    };
  }, [measurements]);

  const selectedDevice = devices.find(
    (device) => device.id === selectedId
  );

  const formatPing = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(2)} ms`;

  const stats = [
    {
      label: "Dostępność",
      value:
        analysis.availability === null
          ? "—"
          : `${analysis.availability.toFixed(1)}%`,
      color: "text-emerald-400",
      icon: Wifi,
    },
    {
      label: "Średni ping",
      value: formatPing(analysis.average),
      color: "text-violet-400",
      icon: Activity,
    },
    {
      label: "Minimalny ping",
      value: formatPing(analysis.minimum),
      color: "text-blue-400",
      icon: ChartNoAxesCombined,
    },
    {
      label: "Maksymalny ping",
      value: formatPing(analysis.maximum),
      color: "text-amber-400",
      icon: Activity,
    },
    {
      label: "Brak odpowiedzi",
      value: String(analysis.offlineCount),
      color: "text-red-400",
      icon: WifiOff,
    },
    {
      label: "Utraty połączenia",
      value: String(analysis.outages),
      color: "text-red-400",
      icon: WifiOff,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Wykresy i statystyki
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Analiza wydajności i dostępności sieci
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-[#342B4E] bg-[#1D1930] px-4 py-2.5 text-sm text-violet-300 hover:bg-[#26213F] disabled:opacity-50"
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />
          Odśwież
        </button>
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap gap-4 rounded-2xl border border-[#342B4E] bg-[#1D1930] p-5">
        <div className="min-w-48 flex-1">
          <label
            htmlFor="chart-device"
            className="mb-2 block text-xs text-zinc-400"
          >
            Urządzenie
          </label>

          <select
            id="chart-device"
            value={selectedId ?? ""}
            onChange={(e) =>
              setSelectedId(
                e.target.value === ""
                  ? null
                  : Number(e.target.value)
              )
            }
            className="w-full rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
          >
            {devices.length === 0 && (
              <option value="">Brak urządzeń</option>
            )}

            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.ip_address})
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-40 flex-1">
          <label
            htmlFor="chart-period"
            className="mb-2 block text-xs text-zinc-400"
          >
            Okres analizy
          </label>

          <select
            id="chart-period"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
          >
            {periods.map((period) => (
              <option key={period.hours} value={period.hours}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {historyLimited && !loading && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
          Osiągnięto limit {MAX_MEASUREMENTS} pomiarów.
          Statystyki mogą nie obejmować całego wybranego
          okresu.
        </div>
      )}

      {loading && measurements.length === 0 && (
        <p className="text-sm text-zinc-400">
          Ładowanie danych analitycznych...
        </p>
      )}

      {!loading && !error && measurements.length === 0 && (
        <p className="rounded-xl border border-[#342B4E] bg-[#1D1930] p-6 text-sm text-zinc-400">
          Brak pomiarów urządzenia w wybranym okresie.
        </p>
      )}

      {/* Karty statystyk */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-400">
                  {stat.label}
                </p>

                <Icon size={19} className={stat.color} />
              </div>

              <p
                className={`mt-3 text-2xl font-bold ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Wykres opóźnień */}
      <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            Historia opóźnień
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            {selectedDevice?.name ?? "Brak urządzenia"} • Ping w ms
          </p>
        </div>

        <div className="h-80 w-full">
          {analysis.chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Brak danych do wyświetlenia
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.chartData}>
                <defs>
                  <linearGradient
                    id="chartsLatencyGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#A855F7"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="#A855F7"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#342B4E"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  stroke="#A1A1AA"
                  tick={{ fontSize: 11 }}
                  minTickGap={30}
                  tickFormatter={(timestamp: number) =>
                    new Date(timestamp).toLocaleString(
                      "pl-PL",
                      hours >= 168
                        ? { day: "2-digit", month: "2-digit" }
                        : { hour: "2-digit", minute: "2-digit" }
                    )
                  }
                />

                <YAxis
                  stroke="#A1A1AA"
                  tick={{ fontSize: 11 }}
                  unit=" ms"
                  width={65}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#100E20",
                    border: "1px solid #342B4E",
                    borderRadius: "12px",
                    color: "#FFFFFF",
                  }}
                  labelFormatter={(timestamp) =>
                    new Date(Number(timestamp)).toLocaleString(
                      "pl-PL"
                    )
                  }
                  formatter={(value) => [
                    value == null
                      ? "Brak odpowiedzi"
                      : `${Number(value).toFixed(2)} ms`,
                    "Opóźnienie",
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#A855F7"
                  strokeWidth={2.5}
                  fill="url(#chartsLatencyGradient)"
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: "#C084FC" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historia dostępności */}
      <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Historia dostępności
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            Ostatnie maksymalnie 40 pomiarów z wybranego okresu
          </p>
        </div>

        <div className="flex h-10 gap-[3px]">
          {analysis.sorted.slice(-40).map((measurement) => {
            const color =
              measurement.status === "online"
                ? "bg-emerald-500"
                : measurement.status === "no_response"
                  ? "bg-red-500"
                  : "bg-violet-500";

            return (
              <div
                key={measurement.id}
                className={`min-w-0 flex-1 rounded-sm ${color}`}
                title={`${new Date(
                  measurement.checked_at
                ).toLocaleString("pl-PL")} – ${measurement.status}`}
              />
            );
          })}
        </div>

        <div className="mt-3 flex justify-between text-xs text-zinc-500">
          <span>Starsze pomiary</span>
          <span>Najnowsze pomiary</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-5 text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            Online
          </span>

          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-red-500" />
            Brak odpowiedzi
          </span>

          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-violet-500" />
            Błąd pomiaru
          </span>
        </div>
      </div>

      {/* Podsumowanie */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Clock3 size={15} />
          Przeanalizowano {measurements.length} pomiarów
        </div>

        <div className="flex items-center gap-2">
          <RefreshCw size={14} />
          Ostatnie odświeżenie:{" "}
          {lastUpdate
            ? lastUpdate.toLocaleTimeString("pl-PL")
            : "Brak"}
        </div>
      </div>
    </div>
  );
}
