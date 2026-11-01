
import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import DeviceTable, {
  type Device,
} from "../components/devices/DeviceTable";

import DeviceFormModal from "../components/devices/DeviceFormModel";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDevices() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          "/api/devices?limit=100&offset=0",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Device[] = await response.json();

        if (!controller.signal.aborted) {
          setDevices(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError("Nie udało się pobrać urządzeń.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDevices();

    return () => controller.abort();
  }, [refreshKey]);

  function handleCreated() {
    setShowModal(false);
    setRefreshKey((key) => key + 1);
  }

  const activeCount = devices.filter((device) => device.is_active).length;
  const inactiveCount = devices.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Urządzenia
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Zarządzaj monitorowanymi urządzeniami
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            aria-label="Odśwież urządzenia"
            className="rounded-xl border border-[#342B4E] bg-[#1D1930] p-3 text-violet-400 hover:bg-[#26213F]"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Dodaj urządzenie
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: "Wszystkie urządzenia",
            count: devices.length,
            color: "text-violet-400",
          },
          {
            title: "Aktywne",
            count: activeCount,
            color: "text-emerald-400",
          },
          {
            title: "Nieaktywne",
            count: inactiveCount,
            color: "text-red-400",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-5"
          >
            <p className="text-sm text-zinc-400">{stat.title}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-zinc-400">
          Ładowanie urządzeń...
        </p>
      )}

      <DeviceTable devices={devices} />

      {showModal && (
        <DeviceFormModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
