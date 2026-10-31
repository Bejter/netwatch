
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardSummary } from "../types/dashboard";

interface StatusDonutProps {
  data: DashboardSummary;
}

const COLORS = ["#22C55E", "#EF4444", "#A78BFA"];

export default function StatusDonut({ data }: StatusDonutProps) {
  const chartData = [
    { name: "Online", value: data.online_devices },
    { name: "Offline", value: data.offline_devices },
    { name: "Nieznane", value: data.unknown_devices },
  ];

  const total = data.active_devices;

  const onlinePercent =
    total > 0
      ? Math.round((data.online_devices / total) * 100)
      : null;

  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
      <h2 className="text-lg font-semibold text-white">
        Status urządzeń
      </h2>

      <p className="mt-1 text-xs text-zinc-400">
        Aktualny stan monitoringu
      </p>

      <div className="relative mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.filter((item) => item.value > 0)}
              dataKey="value"
              innerRadius={78}
              outerRadius={100}
              paddingAngle={total > 1 ? 3 : 0}
              stroke="none"
            >
              {chartData
                .filter((item) => item.value > 0)
                .map((item) => (
                  <Cell
                    key={item.name}
                    fill={COLORS[chartData.findIndex(
                      (entry) => entry.name === item.name
                    )]}
                  />
                ))}
            </Pie>

            <Tooltip
              contentStyle={{
                backgroundColor: "#100E20",
                border: "1px solid #342B4E",
                borderRadius: "12px",
                color: "#FFFFFF",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">
            {onlinePercent === null ? "—" : `${onlinePercent}%`}
          </span>
          <span className="text-xs uppercase tracking-widest text-zinc-400">
            Online
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index] }}
            />
            <span className="text-xs text-zinc-400">
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
