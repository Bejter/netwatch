
import { useEffect, useState } from "react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface Measurement {
  id: number;
  device_id: number;
  status: string;
  latency_ms: number | null;
  checked_at: string;
}

interface LatencyChartProps {
  deviceId: number | null;
}

export default function LatencyChart({
  deviceId,
}: LatencyChartProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
useEffect(() => {
  if (deviceId === null) {
    setMeasurements([]);
    setLoading(false);
    return;
  }

  const controller = new AbortController();

  async function fetchMeasurements() {
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
        setError("Nie udało się pobrać historii pomiarów.");
        console.error(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  setMeasurements([]);
  setLoading(true);
  setError(null);

  void fetchMeasurements();

  // Automatyczne odświeżanie co 30 sekund
  const interval = window.setInterval(() => {
    void fetchMeasurements();
  }, 30000);

  return () => {
    window.clearInterval(interval);
    controller.abort();
  };
  }, [deviceId]);


  
  const chartData = [...measurements]
    .sort(
      (a, b) =>
        new Date(a.checked_at).getTime() -
          new Date(b.checked_at).getTime() ||
        a.id - b.id
    )
    .map((measurement) => ({
      id: measurement.id,
      timestamp: new Date(measurement.checked_at).getTime(),
      latency:
        measurement.status === "online"
          ? measurement.latency_ms
          : null,
      status: measurement.status,
  }));


  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Historia opóźnień
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Ostatnie 100 pomiarów wybranego urządzenia
          </p>
        </div>

        <Activity size={20} className="text-violet-400" />
      </div>

      <div className="h-72 w-full">
        {deviceId === null ? (
          <p className="text-sm text-zinc-400">
            Wybierz urządzenie, aby zobaczyć wykres.
          </p>
        ) : loading ? (
          <p className="text-sm text-zinc-400">
            Ładowanie wykresu...
          </p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Brak pomiarów dla tego urządzenia.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="latencyGradient"
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
                minTickGap={25}
                tickFormatter={(timestamp: number) =>
                  new Date(timestamp).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
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
                  new Date(Number(timestamp)).toLocaleString("pl-PL")
                }
                formatter={(value) => [
                  value == null ? "Brak odpowiedzi" : `${value} ms`,
                  "Opóźnienie",
                ]}
              />


              <Area
                type="monotone"
                dataKey="latency"
                stroke="#A855F7"
                strokeWidth={3}
                fill="url(#latencyGradient)"
                connectNulls={false}
                activeDot={{ r: 5, fill: "#C084FC" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
