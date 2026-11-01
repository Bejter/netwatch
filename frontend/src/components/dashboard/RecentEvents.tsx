
import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  RefreshCw,
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

export default function RecentEvents() {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadEvents = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/events/recent?limit=5&offset=0",
        { signal }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: NetworkEvent[] = await response.json();

      if (!signal.aborted) {
        setEvents(data);
      }
    } catch (err) {
      if (!signal.aborted) {
        console.error("Błąd pobierania zdarzeń:", err);
        setError("Nie udało się pobrać zdarzeń.");
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadEvents(controller.signal);

    return () => controller.abort();
  }, [loadEvents, refreshKey]);

  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
      {/* Nagłówek */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Ostatnie zdarzenia
          </h2>

          <p className="mt-1 text-xs text-zinc-400">
            Historia aktywności urządzeń
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          title="Odśwież zdarzenia"
          aria-label="Odśwież zdarzenia"
          className="rounded-xl bg-violet-500/10 p-2 text-violet-400 transition hover:bg-violet-500/20 disabled:opacity-50"
        >
          <RefreshCw
            size={20}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Ładowanie */}
      {loading && events.length === 0 && (
        <p className="py-6 text-center text-sm text-zinc-400">
          Ładowanie zdarzeń...
        </p>
      )}

      {/* Błąd */}
      {error && (
        <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Brak zdarzeń */}
      {!loading && !error && events.length === 0 && (
        <div className="py-8 text-center">
          <CircleCheck
            size={30}
            className="mx-auto mb-3 text-emerald-400"
          />

          <p className="text-sm text-zinc-300">
            Brak ostatnich zdarzeń
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Zmiany statusów urządzeń pojawią się tutaj.
          </p>
        </div>
      )}

      {/* Lista rzeczywistych zdarzeń */}
      <div className="space-y-2">
        {events.map((event) => {
          const isOnline = event.status === "online";
          const Icon = isOnline ? CircleCheck : WifiOff;

          return (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-violet-500/10 hover:bg-white/5"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isOnline
                    ? "bg-emerald-500/10"
                    : "bg-red-500/10"
                }`}
              >
                <Icon
                  size={19}
                  className={
                    isOnline
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {event.device_name}
                </p>

                <p className="truncate text-xs text-zinc-400">
                  {event.description}
                </p>
              </div>

              <span className="shrink-0 text-xs text-zinc-500">
                {new Date(event.created_at).toLocaleString(
                  "pl-PL",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-[#342B4E] pt-4">
        <p className="text-center text-xs text-zinc-500">
          Wyświetlono {events.length} ostatnich zdarzeń
        </p>
      </div>
    </div>
  );
}
