
import { Bell, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useState } from "react";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Monitoruj swoją sieć w czasie rzeczywistym",
  },
  "/devices": {
    title: "Urządzenia",
    description: "Zarządzaj urządzeniami w swojej sieci",
  },
  "/network": {
    title: "Mapa sieci",
    description: "Wizualizacja infrastruktury sieciowej",
  },
  "/monitoring": {
    title: "Monitoring",
    description: "Podgląd działania monitoringu",
  },
  "/charts": {
    title: "Wykresy",
    description: "Analiza opóźnień i dostępności",
  },
  "/alerts": {
    title: "Alerty",
    description: "Powiadomienia o problemach z urządzeniami",
  },
  "/settings": {
    title: "Ustawienia",
    description: "Konfiguracja aplikacji NetWatch",
  },
};

export default function Header() {
  const location = useLocation();
  const page = pageTitles[location.pathname] ?? {
    title: "NetWatch",
    description: "Panel monitorowania sieci",
  };

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    // Później podłączymy odświeżanie danych z FastAPI.
  };

  return (
    <header className="border-b border-[#29243F] pb-6">
      <div className="flex flex-wrap items-center justify-between gap-5">

        {/* Tytuł strony */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {page.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {page.description}
          </p>
        </div>

        {/* Prawa sekcja */}
        <div className="flex items-center gap-3">

          {/* Status interfejsu */}
          <div className="hidden items-center gap-2 rounded-xl border border-[#342B4E] bg-[#1D1930] px-4 py-3 sm:flex">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-xs font-medium text-zinc-300">
              Panel aktywny
            </span>
          </div>

          {/* Przycisk odświeżania */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Zapisz czas odświeżenia"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#342B4E] bg-[#1D1930] text-violet-300 transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-900/30"
          >
            <RefreshCw size={19} />
          </button>

          {/* Przycisk powiadomień – podłączymy później */}
          <button
            type="button"
            disabled
            title="Powiadomienia będą dostępne w kolejnych etapach"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#342B4E] bg-[#1D1930] text-violet-300 opacity-60"
          >
            <Bell size={19} />
          </button>
        </div>
      </div>

      {/* Dolna linia */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Centrum monitoringu
        </span>

        <span className="text-xs text-violet-400">
          {lastRefresh
            ? `Przycisk kliknięty: ${lastRefresh.toLocaleTimeString("pl-PL")}`
            : "NetWatch Premium"}
        </span>
      </div>
    </header>
  );
}
