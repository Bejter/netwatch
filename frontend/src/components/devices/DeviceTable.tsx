
import { useState } from "react";
import { Monitor, Search } from "lucide-react";

export interface Device {
  id: number;
  name: string;
  ip_address: string;
  is_active: boolean;
  created_at: string;
}

interface DeviceTableProps {
  devices: Device[];
}

export default function DeviceTable({
  devices,
}: DeviceTableProps) {
  const [search, setSearch] = useState("");

  const filteredDevices = devices.filter((device) => {
    const query = search.toLowerCase();

    return (
      device.name.toLowerCase().includes(query) ||
      device.ip_address.includes(query)
    );
  });

  return (
    <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Wyszukaj urządzenie..."
          className="w-full rounded-xl border border-[#342B4E] bg-[#100E20] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-violet-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#342B4E] text-xs uppercase tracking-wider text-zinc-500">
              <th className="pb-4 font-medium">Urządzenie</th>
              <th className="pb-4 font-medium">Adres IP</th>
              <th className="pb-4 font-medium">Monitoring</th>
              <th className="pb-4 font-medium">Data dodania</th>
            </tr>
          </thead>

          <tbody>
            {filteredDevices.map((device) => (
              <tr
                key={device.id}
                className="border-b border-[#342B4E]/50 transition hover:bg-white/5"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-500/10 p-3">
                      <Monitor size={19} className="text-violet-400" />
                    </div>

                    <span className="font-medium text-white">
                      {device.name}
                    </span>
                  </div>
                </td>

                <td className="py-4 text-sm text-zinc-400">
                  {device.ip_address}
                </td>

                <td className="py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      device.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-500/10 text-zinc-400"
                    }`}
                  >
                    {device.is_active ? "Aktywny" : "Wyłączony"}
                  </span>
                </td>

                <td className="py-4 text-sm text-zinc-400">
                  {new Date(device.created_at).toLocaleDateString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDevices.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-400">
            Nie znaleziono urządzeń.
          </p>
        )}
      </div>
    </div>
  );
}
