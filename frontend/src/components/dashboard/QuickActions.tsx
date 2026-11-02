
import {
  FileBarChart,
  Plus,
  ScanSearch,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Dodaj urządzenie",
      description: "Zarządzaj urządzeniami",
      icon: Plus,
      onClick: () => navigate("/devices"),
      enabled: true,
      primary: true,
    },
    {
      title: "Skanuj sieć",
      description: "Wkrótce dostępne",
      icon: ScanSearch,
      onClick: () => navigate("/network"),
      enabled: true,
      primary: true,
    },
    {
      title: "Generuj raport",
      description: "Wkrótce dostępne",
      icon: FileBarChart,
      onClick: () => {},
      enabled: false,
      primary: false,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Szybkie akcje
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Zarządzaj swoją siecią
          </p>
        </div>

        <div className="rounded-xl bg-violet-500/10 p-2">
          <Zap size={20} className="text-violet-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.title}
              type="button"
              onClick={action.onClick}
              disabled={!action.enabled}
              title={!action.enabled ? "Funkcja w przygotowaniu" : action.title}
              className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 ${
                !action.enabled
                  ? "cursor-not-allowed border-[#342B4E] bg-[#100E20] opacity-55"
                  : action.primary
                    ? "cursor-pointer border-violet-500/40 bg-gradient-to-br from-violet-700 to-purple-900 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-900/30"
                    : "cursor-pointer border-[#342B4E] bg-[#100E20] hover:border-violet-500/40"
              }`}
            >
              <Icon size={25} className="text-violet-100" />

              <span className="text-sm font-semibold text-white">
                {action.title}
              </span>

              <span className="text-xs text-violet-200/70">
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
