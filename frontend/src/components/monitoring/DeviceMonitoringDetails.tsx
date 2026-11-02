
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

interface Measurement {
  id: number;
  device_id: number;
  status: string;
  latency_ms: number | null;
  checked_at: string;
}

interface DeviceMonitoringDetailsProps {
  deviceId: number;
  deviceName: string;
  ipAddress: string;
  onClose: () => void;
}

export default function DeviceMonitoringDetails({
  deviceId,
  deviceName,
  ipAddress,
  onClose,
}: DeviceMonitoringDetailsProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;

    async function loadMeasurements() {
      if (fetching || controller.signal.aborted) return;

      fetching = true;

      try {
        const response = await fetch(
          `/api/devices/${deviceId}/measurements?limit=100&offset=0`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Measurement[] = await response.json();

        if (!controller.signal.aborted) {
          setMeasurements(data);
          setError(null);
        }
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

    setLoading(true);
    setMeasurements([]);
    setError(null);

    void loadMeasurements();

    const interval = window.setInterval(() => {
      void loadMeasurements();
    }, 30000);

    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [deviceId, refreshKey]);

  const stats = useMemo(() => {
    const sorted = [...measurements].sort(
      (a, b) =>
        new Date(a.checked_at).getTime() -
          new Date(b.checked_at).getTime() ||
        a.id - b.id
    );

    const online = sorted.filter(
      (item) => item.status === "online"
    );

    const offline = sorted.filter(
      (item) => item.status === "no_response"
    );

    const valid = online.length + offline.length;

    const latencies = online
      .map((item) => item.latency_ms)
      .filter((value): value is number => value !== null);

    const avgLatency = latencies.length
      ? latencies.reduce((sum, value) => sum + value, 0) /
        latencies.length
      : null;

    const minLatency = latencies.length
      ? Math.min(...latencies)
      : null;

    const maxLatency = latencies.length
      ? Math.max(...latencies)
      : null;

    let outages = 0;
    let previousStatus: string | null = null;

    for (const measurement of sorted) {
      const status = measurement.status;

      if (status !== "online" && status !== "no_response") {
        continue;
      }

      if (
        previousStatus === "online" &&
        status === "no_response"
      ) {
        outages++;
      }

      previousStatus = status;
    }

    return {
      sorted,
      online: online.length,
      offline: offline.length,
      availability: valid
        ? (online.length / valid) * 100
        : null,
      avgLatency,
      minLatency,
      maxLatency,
      outages,
    };
  }, [measurements]);

  const formatLatency = (value: number | null) =>
    value === null ? "—" : `${value.toFixed(2)} ms`;

  const summaryCards = [
    {
      label: "Dostępność",
      value:
        stats.availability === null
          ? "—"
          : `${stats.availability.toFixed(1)}%`,
      color: "text-emerald-400",
    },
    {
      label: "Średni ping",
      value: formatLatency(stats.avgLatency),
      color: "text-violet-400",
    },
    {
      label: "Minimalny ping",
      value: formatLatency(stats.minLatency),
      color: "text-blue-400",
    },
    {
      label: "Maksymalny ping",
      value: formatLatency(stats.maxLatency),
      color: "text-amber-400",
    },
    {
      label: "Nieudane pomiary",
      value: String(stats.offline),
      color: "text-red-400",
    },
    {
      label: "Utraty połączenia",
      value: String(stats.outages),
      color: "text-red-400",
    },
  ];

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-[#1D1930] p-6">

      {/* Nagłówek */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={21} className="text-violet-400" />

            <h2 className="text-xl font-semibold text-white">
              {deviceName}
            </h2>
          </div>

          <p className="mt-2 text-sm text-zinc-400">
            {ipAddress} • Diagnostyka urządzenia
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Statystyki z ostatnich {measurements.length} pomiarów
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            title="Odśwież pomiary"
            className="rounded-lg bg-violet-500/10 p-2.5 text-violet-400 hover:bg-violet-500/20 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Zamknij szczegóły"
            className="rounded-lg bg-white/5 p-2.5 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && measurements.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-400">
          Ładowanie danych urządzenia...
        </p>
      )}

      {!loading && !error && measurements.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-400">
          To urządzenie nie ma jeszcze zapisanych pomiarów.
        </p>
      )}

      {measurements.length > 0 && (
        <>
          {/* Statystyki */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[#342B4E] bg-[#100E20] p-4"
              >
                <p className="text-xs text-zinc-400">
                  {card.label}
                </p>

                <p
                  className={`mt-2 text-xl font-bold ${card.color}`}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Historia dostępności */}
          <div className="mt-5 rounded-xl border border-[#342B4E] bg-[#100E20] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">
                  Historia dostępności
                </h3>

                <p className="mt-1 text-xs text-zinc-400">
                  Każdy segment oznacza jeden pomiar
                </p>
              </div>

              <Wifi size={19} className="text-violet-400" />
            </div>

            <div className="flex h-12 items-stretch gap-[2px]">
              {stats.sorted.slice(-50).map((measurement) => {
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
                    title={`${
                      new Date(
                        measurement.checked_at
                      ).toLocaleString("pl-PL")
                    } • ${measurement.status}`}
                  />
                );
              })}
            </div>

            <div className="mt-3 flex justify-between gap-3 text-xs text-zinc-500">
              <span>Najstarszy pomiar</span>
              <span>Najnowszy pomiar</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Wifi size={15} className="text-emerald-400" />
                Online
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <WifiOff size={15} className="text-red-400" />
                Brak odpowiedzi
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-3 w-3 rounded-sm bg-violet-500" />
                Błąd pomiaru
              </div>
            </div>
          </div>

          {/* Ostatnie pomiary */}
          <div className="mt-5 rounded-xl border border-[#342B4E] bg-[#100E20] p-5">
            <h3 className="mb-4 font-semibold text-white">
              Ostatnie pomiary
            </h3>

            <div className="space-y-2">
              {[...stats.sorted]
                .reverse()
                .slice(0, 5)
                .map((measurement) => (
                  <div
                    key={measurement.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-[#342B4E]/50 py-2 text-sm last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          measurement.status === "online"
                            ? "bg-emerald-400"
                            : measurement.status === "no_response"
                              ? "bg-red-400"
                              : "bg-violet-400"
                        }`}
                      />

                      <span className="text-zinc-300">
                        {measurement.status === "online"
                          ? "Online"
                          : measurement.status === "no_response"
                            ? "Brak odpowiedzi"
                            : "Błąd pomiaru"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-zinc-300">
                        {formatLatency(
                          measurement.latency_ms
                        )}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock3 size={13} />
                        {new Date(
                          measurement.checked_at
                        ).toLocaleTimeString("pl-PL")}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
