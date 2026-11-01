
import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, X } from "lucide-react";

import DeviceTable, {
  type Device,
} from "../components/devices/DeviceTable";

import DeviceFormModal from "../components/devices/DeviceFormModel";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  function refreshDevices() {
    setRefreshKey((key) => key + 1);
  }

  function handleAdd() {
    setEditingDevice(null);
    setShowModal(true);
  }

  function handleEdit(device: Device) {
    setEditingDevice(device);
    setShowModal(true);
  }

  function handleSaved() {
    setShowModal(false);
    setEditingDevice(null);
    refreshDevices();
  }

  function handleClose() {
    setShowModal(false);
    setEditingDevice(null);
  }

  async function handleDelete() {
    if (!deletingDevice || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `/api/devices/${deletingDevice.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setDeletingDevice(null);
      refreshDevices();
    } catch (err) {
      console.error(err);
      setDeleteError("Nie udało się usunąć urządzenia.");
    } finally {
      setDeleting(false);
    }
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
            onClick={refreshDevices}
            disabled={loading}
            title="Odśwież urządzenia"
            className="rounded-xl border border-[#342B4E] bg-[#1D1930] p-3 text-violet-400 hover:bg-[#26213F]"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={handleAdd}
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

      <DeviceTable
        devices={devices}
        onEdit={handleEdit}
        onDelete={(device) => {
          setDeleteError(null);
          setDeletingDevice(device);
        }}
      />

      {showModal && (
        <DeviceFormModal
          device={editingDevice}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}

      {/* Potwierdzenie usunięcia */}
      {deletingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-device-title"
            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#1D1930] p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className="rounded-xl bg-red-500/10 p-3">
                <Trash2 size={24} className="text-red-400" />
              </div>

              <button
                type="button"
                onClick={() => setDeletingDevice(null)}
                disabled={deleting}
                aria-label="Zamknij"
                className="text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <h2
              id="delete-device-title"
              className="text-xl font-semibold text-white"
            >
              Usunąć urządzenie?
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Czy na pewno chcesz usunąć urządzenie{" "}
              <strong className="text-white">
                {deletingDevice.name}
              </strong>
              {" "}({deletingDevice.ip_address})?
            </p>

            <p className="mt-3 text-xs text-red-400">
              Uwaga: usunięcie urządzenia może również usunąć
              jego historię pomiarów, zależnie od konfiguracji
              relacji w bazie danych.
            </p>

            {deleteError && (
              <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingDevice(null)}
                disabled={deleting}
                className="rounded-xl border border-[#342B4E] px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Anuluj
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 size={17} />
                {deleting ? "Usuwanie..." : "Usuń urządzenie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
