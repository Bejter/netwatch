
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Save, X } from "lucide-react";
import type { Device } from "./DeviceTable";

interface DeviceFormModalProps {
  device?: Device | null;
  initialIp?: string;
  initialName?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function DeviceFormModal({
  device,
  initialIp,
  initialName,
  onClose,
  onSaved,
}: DeviceFormModalProps) {
  const isEditing = Boolean(device);

  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(device?.name ?? initialName ?? "");
    setIpAddress(device?.ip_address ?? initialIp ?? "");
    setIsActive(device?.is_active ?? true);
    setError(null);
  }, [device, initialName, initialIp]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim() || !ipAddress.trim()) {
      setError("Uzupełnij wymagane pola.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        isEditing ? `/api/devices/${device!.id}` : "/api/devices",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            ip_address: ipAddress.trim(),
            is_active: isActive,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Urządzenie z tym adresem IP już istnieje.");
        }

        const details = await response.json().catch(() => null);
        console.error("Błąd API:", details);

        throw new Error(
          `Nie udało się zapisać urządzenia (HTTP ${response.status}).`
        );
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Wystąpił nieoczekiwany błąd."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-modal-title"
        className="w-full max-w-md rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2
              id="device-modal-title"
              className="text-xl font-semibold text-white"
            >
              {isEditing ? "Edytuj urządzenie" : "Dodaj urządzenie"}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {isEditing
                ? "Zmień konfigurację monitorowanego urządzenia"
                : "Dodaj nowe urządzenie do monitoringu"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Zamknij formularz"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="device-name"
              className="mb-2 block text-sm text-zinc-300"
            >
              Nazwa urządzenia
            </label>

            <input
              id="device-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Router główny"
              required
              maxLength={100}
              className="w-full rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-3 text-white outline-none transition focus:border-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="device-ip"
              className="mb-2 block text-sm text-zinc-300"
            >
              Adres IP
            </label>

            <input
              id="device-ip"
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.0.1"
              required
              readOnly={!isEditing && Boolean(initialIp)}
              className="w-full read-only:cursor-not-allowed read-only:opacity-70 rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-3 text-white outline-none transition focus:border-violet-500"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />

            <span className="text-sm text-zinc-300">
              Włącz monitoring urządzenia
            </span>
          </label>

          {error && (
            <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[#342B4E] px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
            >
              Anuluj
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {isEditing ? <Save size={17} /> : <Plus size={17} />}

              {loading
                ? "Zapisywanie..."
                : isEditing
                  ? "Zapisz zmiany"
                  : "Dodaj urządzenie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
