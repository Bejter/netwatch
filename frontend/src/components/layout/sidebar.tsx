import { Activity, Bell, ChartNoAxesCombined, ChevronRight, LayoutDashboard, Network, Server, Settings, ShieldCheck, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Urządzenia", path: "/devices", icon: Server },
  { name: "Mapa sieci", path: "/network", icon: Network },
  { name: "Monitoring", path: "/monitoring", icon: Activity },
  { name: "Wykresy", path: "/charts", icon: ChartNoAxesCombined },
  { name: "Alerty", path: "/alerts", icon: Bell },
  { name: "Ustawienia", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[#29243F] bg-[#100E20] px-4 py-6 text-white">

      {/* Logo */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-800 shadow-lg shadow-purple-900/30">
          <Network size={25} className="text-white" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Net<span className="text-violet-400">Watch</span>
          </h1>
          <p className="text-[10px] font-medium tracking-[0.16em] text-zinc-500">
            NETWORK MONITORING
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Menu główne
      </div>

      <nav className="flex flex-col gap-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border border-violet-500/25 bg-gradient-to-r from-violet-700/70 to-purple-900/40 text-white shadow-md shadow-violet-950/20"
                    : "border border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    className={
                      isActive
                        ? "text-violet-300"
                        : "text-zinc-500 transition-colors group-hover:text-violet-400"
                    }
                  />

                  <span className="flex-1">{item.name}</span>

                  {isActive && (
                    <ChevronRight
                      size={15}
                      className="text-violet-400"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Dolna część */}
      <div className="mt-auto">

        {/* Status systemu */}
        <div className="mb-5 rounded-xl border border-violet-500/15 bg-[#1D1930] p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck size={17} className="text-violet-400" />
            <span className="text-xs font-semibold text-white">
              Status systemu
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Prywatny panel monitoringu
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-xs text-violet-300">
              Panel aktywny
            </span>
          </div>
        </div>

        <div className="mb-4 border-t border-[#29243F]" />

        {/* Użytkownik */}
        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-500/20 bg-[#30244A]">
            <UserRound size={20} className="text-violet-300" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              Administrator
            </p>
            <p className="text-xs text-zinc-500">
              NetWatch Local
            </p>
          </div>

          <div className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      </div>
    </aside>
  );
}
