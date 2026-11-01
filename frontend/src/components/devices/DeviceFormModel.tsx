
import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";

interface DeviceFormModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function DeviceFormModal({
  onClose,
  onCreated,
}: DeviceFormModalProps) {
  const [name, setName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim() || !ipAddress.trim()) {
      setError("Uzupełnij wszystkie wymagane pola.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          ip_address: ipAddress.trim(),
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Urządzenie o tym adresie IP już istnieje.");
        }

        const details = await response.json().catch(() => null);
        console.error("Błąd API:", details);

        throw new Error(`Nie udało się dodać urządzenia (HTTP ${response.status}).`);
      }

      onCreated();
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
        aria-labelledby="add-device-title"
        className="w-full max-w-md rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2
              id="add-device-title"
              className="text-xl font-semibold text-white"
            >
              Dodaj urządzenie
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Dodaj urządzenie do monitorowania
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
            <label className="mb-2 block text-sm text-zinc-300">
              Nazwa urządzenia
            </label>
            <input
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
            <label className="mb-2 block text-sm text-zinc-300">
              Adres IP
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.0.1"
              required
              className="w-full rounded-xl border border-[#342B4E] bg-[#100E20] px-4 py-3 text-white outline-none transition focus:border-violet-500"
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
              <Plus size={17} />
              {loading ? "Dodawanie..." : "Dodaj urządzenie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
