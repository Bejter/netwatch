import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: "purple" | "blue" | "green" | "red";
}

const colorVariants = {
  purple: {
    icon: "text-violet-400",
    background: "bg-violet-500/10",
    dot: "bg-violet-400",
  },
  blue: {
    icon: "text-blue-400",
    background: "bg-blue-500/10",
    dot: "bg-blue-400",
  },
  green: {
    icon: "text-emerald-400",
    background: "bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
  red: {
    icon: "text-red-400",
    background: "bg-red-500/10",
    dot: "bg-red-400",
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color,
}: StatsCardProps) {
  const colors = colorVariants[color];

  return (
    <div className="group rounded-2xl border border-[#342B4E] bg-[#1D1930] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-950/20">

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-400">
          {title}
        </p>

        <div className={`rounded-xl p-3 ${colors.background}`}>
          <Icon size={22} className={colors.icon} />
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-4xl font-bold tracking-tight text-white">
          {value}
        </h2>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
        <span className="text-xs text-zinc-500">
          NetWatch Monitoring
        </span>
      </div>
    </div>
  );
}
