import { useEffect, useState } from "react";
import { Server, Activity, CircleCheck, TriangleAlert } from "lucide-react";

import StatsCard from "../components/dashboard/StatsCard";
import type { DashboardSummary } from "../components/types/dashboard";
import LatencyChart from "../components/dashboard/LatencyChart";
import StatusDonut from "../components/dashboard/StatusDonut";
import NetworkMap from "../components/dashboard/NetworkMap";
import RecentEvents from "../components/dashboard/RecentEvents";
import QuickActions from "../components/dashboard/QuickActions";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [devices, setDevices] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        const response = await fetch("/api/dashboard/summary", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result: DashboardSummary = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("Nie udało się pobrać danych z FastAPI.");
          console.error(err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void fetchDashboard();

    return () => controller.abort();
  }, []);

  useEffect(() => {
  const controller = new AbortController();

  async function fetchDevices() {
    try {
      const response = await fetch(
        "/api/devices?limit=100&offset=0",
        { signal: controller.signal }
      );

      
      if (!response.ok) throw new Error("Błąd pobierania urządzeń");

      const result: { id: number; name: string }[] =
        await response.json();

      setDevices(result);

      if (result.length > 0) {
        setSelectedDeviceId(result[0].id);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error(err);
      }
    }
  }

  void fetchDevices();

  return () => controller.abort();
  }, []);

  if (loading) {
    return <p className="text-zinc-400">Ładowanie statystyk...</p>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
        {error ?? "Brak danych dashboardu."}
      </div>
    );
  }

  console.log("Devices:", devices);
  console.log("Selected device:", selectedDeviceId);
  
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <StatsCard
          title="Wszystkie urządzenia"
          value={data.total_devices}
          icon={Server}
          color="purple"
        />

        <StatsCard
          title="Monitorowane"
          value={data.active_devices}
          icon={Activity}
          color="blue"
        />

        <StatsCard
          title="Online"
          value={data.online_devices}
          icon={CircleCheck}
          color="green"
        />

        <StatsCard
          title="Offline"
          value={data.offline_devices}
          icon={TriangleAlert}
          color="red"
        />

      </section>

      <p className="text-sm text-zinc-500">
        Urządzenia o nieznanym statusie: {data.unknown_devices}
      </p>

<section className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="text-xl font-semibold text-white">
      Analiza sieci
    </h2>

    <select
      value={selectedDeviceId ?? ""}
      onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
      className="rounded-xl border border-[#342B4E] bg-[#1D1930] px-4 py-2 text-sm text-white outline-none focus:border-violet-500"
    >
      {devices.length === 0 && (
        <option value="">Brak urządzeń</option>
      )}

      {devices.map((device) => (
        <option key={device.id} value={device.id}>
          {device.name}
        </option>
      ))}
    </select>
  </div>

  <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
    <div className="min-w-0 xl:col-span-2">
      <LatencyChart deviceId={selectedDeviceId} />
    </div>

    <div className="min-w-0">
      <StatusDonut data={data} />
    </div>
  </div>
  </section>

  <section className="mt-6">
    <NetworkMap />
  </section>

  <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    <RecentEvents />
    <QuickActions />
  </section>

  </div>
  );
}
