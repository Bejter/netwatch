
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

interface NetworkEvent {
  id: number;
  device_id: number;
  device_name: string;
  status: "online" | "offline";
  description: string;
  created_at: string;
}

type AlertFilter = "all" | "offline" | "online";

const REFRESH_INTERVAL = 30000;
const EVENTS_LIMIT = 100;

export default function AlertsPage() {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [filter, setFilter] = useState<AlertFilter>("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pobieranie alertów z FastAPI.
  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;

    async function loadAlerts() {
      if (fetching || controller.signal.aborted) return;

      fetching = true;

      try {
        const response = await fetch(
          `/api/events/recent?limit=${EVENTS_LIMIT}&offset=0`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: NetworkEvent[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Nieprawidłowa odpowiedź API");
        }

        if (!controller.signal.aborted) {
          setEvents(data);
          setError(null);
          setLastUpdate(new Date());
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Błąd pobierania alertów:", err);
          setError("Nie udało się pobrać historii alertów.");
        }
      } finally {
        fetching = false;

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadAlerts();

    // Odświeżamy alerty co 30 sekund.
    const interval = window.setInterval(() => {
      void loadAlerts();
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, [refreshKey]);

  // Liczniki dotyczą pobranych zdarzeń.
  const offlineCount = events.filter(
    (event) => event.status === "offline"
  ).length;

  const onlineCount = events.filter(
    (event) => event.status === "online"
  ).length;

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events
      .filter((event) => {
        if (filter !== "all" && event.status !== filter) {
          return false;
        }

        return (
          event.device_name.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          String(event.device_id).includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime() ||
          b.id - a.id
      );
  }, [events, filter, search]);

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Nieznana data";
    }

    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <BellRing
              size={26}
              className="text-violet-400"
            />

            <h1 className="text-2xl font-bold text-white">
              Centrum alertów
            </h1>
          </div>

          <p className="mt-2 text-sm text-zinc-400">
            Historia awarii i przywróceń połączenia
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

      {/* Statystyki */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: "Utraty połączenia",
            value: offlineCount,
            icon: AlertTriangle,
            color: "text-red-400",
            background: "bg-red-500/10",
          },
          {
            title: "Przywrócenia połączenia",
            value: onlineCount,
            icon: CheckCircle2,
            color: "text-emerald-400",
            background: "bg-emerald-500/10",
          },
          {
            title: "Wszystkie zdarzenia",
            value: events.length,
            icon: BellRing,
            color: "text-violet-400",
            background: "bg-violet-500/10",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  {stat.title}
                </p>

                <div
                  className={`rounded-xl p-2.5 ${stat.background}`}
                >
                  <Icon size={20} className={stat.color} />
                </div>
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

      {/* Historia alertów */}
      <section className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Historia alertów
            </h2>

            <p className="mt-1 text-xs text-zinc-400">
              Ostatnie maksymalnie {EVENTS_LIMIT} zdarzeń
              wykrytych przez NetWatch
            </p>
          </div>

          <span className="rounded-lg bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            {filteredEvents.length} wyników
          </span>
        </div>

        {/* Wyszukiwanie */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Wyszukaj urządzenie lub zdarzenie..."
              className="w-full rounded-xl border border-[#342B4E] bg-[#100E20] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as AlertFilter)
            }
            className="rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
          >
            <option value="all">Wszystkie zdarzenia</option>
            <option value="offline">Utraty połączenia</option>
            <option value="online">Przywrócenia połączenia</option>
          </select>
        </div>

        {/* Błędy */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Ładowanie */}
        {loading && events.length === 0 && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-violet-300">
            <RefreshCw
              size={19}
              className="animate-spin"
            />
            Pobieranie alertów...
          </div>
        )}

        {/* Brak alertów */}
        {!loading &&
          !error &&
          filteredEvents.length === 0 && (
            <div className="py-12 text-center">
              <ShieldCheck
                size={34}
                className="mx-auto mb-3 text-violet-400"
              />

              <p className="text-sm font-medium text-zinc-200">
                Brak zdarzeń spełniających kryteria
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Zmiany stanu urządzeń pojawią się tutaj.
              </p>
            </div>
          )}

        {/* Lista alertów */}
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const isOffline = event.status === "offline";
            const Icon = isOffline ? WifiOff : CheckCircle2;

            return (
              <div
                key={event.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isOffline
                    ? "border-red-500/15 bg-red-500/[0.04] hover:border-red-500/30"
                    : "border-emerald-500/15 bg-emerald-500/[0.04] hover:border-emerald-500/30"
                }`}
              >
                <div className="flex flex-wrap items-center gap-4">
                  {/* Ikona */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      isOffline
                        ? "bg-red-500/10"
                        : "bg-emerald-500/10"
                    }`}
                  >
                    <Icon
                      size={22}
                      className={
                        isOffline
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    />
                  </div>

                  {/* Opis */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">
                        {event.device_name}
                      </h3>

                      <span
                        className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                          isOffline
                            ? "bg-red-500/10 text-red-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {isOffline
                          ? "Awaria połączenia"
                          : "Przywrócenie"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-zinc-400">
                      {event.description}
                    </p>
                  </div>

                  {/* Czas zdarzenia */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock3 size={14} />
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stopka */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} />
          Historia zdarzeń monitoringu ICMP
        </div>

        <div className="flex items-center gap-2">
          <RefreshCw size={14} />
          Ostatnia aktualizacja:{" "}
          {lastUpdate
            ? lastUpdate.toLocaleTimeString("pl-PL")
            : "Brak"}
        </div>
      </div>
    </div>
  );
}
