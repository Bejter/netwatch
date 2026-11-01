
import { useEffect, useRef, useState } from "react";
import {
  Check,
  LoaderCircle,
  Monitor,
  Radar,
  ScanSearch,
  Plus,
  Wifi,
} from "lucide-react";

import DeviceFormModal from "../devices/DeviceFormModel";

interface DiscoveredDevice {
  ip_address: string;
  detection_method: string;
  hostname?: string | null;
}

interface DiscoveryResponse {
  discovered_devices: DiscoveredDevice[];
}

interface ExistingDevice {
  id: number;
  name: string;
  ip_address: string;
}

interface NetworkDiscoveryProps {
  onDeviceAdded?: () => void;
}

export default function NetworkDiscovery({
  onDeviceAdded,
}: NetworkDiscoveryProps) {
  const network = "192.168.0.0/24";

  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [existingDevices, setExistingDevices] = useState<
    ExistingDevice[]
  >([]);

  const [selectedDevice, setSelectedDevice] =
    useState<DiscoveredDevice | null>(null);

  const [scanning, setScanning] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const scanController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      scanController.current?.abort();
    };
  }, []);

  async function fetchExistingDevices(
    signal?: AbortSignal
  ): Promise<ExistingDevice[]> {
    const response = await fetch(
      "/api/devices?limit=100&offset=0",
      { signal }
    );

    if (!response.ok) {
      throw new Error(
        `Nie udało się pobrać urządzeń (HTTP ${response.status}).`
      );
    }

    const data: ExistingDevice[] = await response.json();

    if (!signal?.aborted) {
      setExistingDevices(data);
    }

    return data;
  }

  async function handleScan() {
    if (scanning || loadingDevices) return;

    const controller = new AbortController();
    scanController.current = controller;

    setScanning(true);
    setHasScanned(false);
    setDevices([]);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/network/discover",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ network }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Skanowanie nie powiodło się (HTTP ${response.status}).`
        );
      }

      const data: DiscoveryResponse = await response.json();

      if (!Array.isArray(data.discovered_devices)) {
        throw new Error(
          "Backend zwrócił nieprawidłowy format danych."
        );
      }

      // Sprawdzamy, które adresy są już w PostgreSQL.
      await fetchExistingDevices(controller.signal);

      if (controller.signal.aborted) return;

      // Usuwamy ewentualne duplikaty z wyników.
      const uniqueDevices = Array.from(
        new Map(
          data.discovered_devices.map((device) => [
            device.ip_address,
            device,
          ])
        ).values()
      );

      setDevices(uniqueDevices);
      setHasScanned(true);

      setMessage(
        `Zakończono skanowanie. Wykryto ${uniqueDevices.length} urządzeń.`
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Błąd skanowania:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Nieznany błąd skanowania."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setScanning(false);
      }
    }
  }

  async function handleDeviceSaved() {
    setSelectedDevice(null);
    setError(null);
    setMessage("Urządzenie zostało dodane do monitoringu.");

    // Odświeżamy mapę sieci na stronie.
    onDeviceAdded?.();

    setLoadingDevices(true);

    try {
      await fetchExistingDevices();
    } catch (err) {
      console.error(err);
      setError(
        "Urządzenie zapisano, ale nie udało się odświeżyć listy."
      );
    } finally {
      setLoadingDevices(false);
    }
  }

  const existingIps = new Set(
    existingDevices.map((device) => device.ip_address)
  );

  const newCount = devices.filter(
    (device) => !existingIps.has(device.ip_address)
  ).length;

  return (
    <>
      <div className="rounded-2xl border border-[#342B4E] bg-[#1D1930] p-6">

        {/* Nagłówek */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Wykrywanie urządzeń
            </h2>

            <p className="mt-1 text-xs text-zinc-400">
              Automatyczne wyszukiwanie urządzeń w sieci lokalnej
            </p>
          </div>

          <div className="rounded-xl bg-violet-500/10 p-3">
            <Radar size={22} className="text-violet-400" />
          </div>
        </div>

        {/* Panel skanowania */}
        <div className="rounded-xl border border-[#342B4E] bg-[#100E20] p-5">
          <label
            htmlFor="discovery-network"
            className="mb-2 block text-xs font-medium text-zinc-400"
          >
            Skanowana podsieć
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="discovery-network"
              type="text"
              value={network}
              readOnly
              className="min-w-0 flex-1 rounded-xl border border-[#342B4E] bg-[#1D1930] px-4 py-3 text-sm text-white outline-none"
            />

            <button
              type="button"
              onClick={handleScan}
              disabled={scanning || loadingDevices}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <ScanSearch size={18} />
              )}

              {scanning ? "Skanowanie..." : "Skanuj sieć"}
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
            <Wifi size={14} className="shrink-0" />

            <span>
              Wykrywanie odbywa się przez ICMP.
              Niektóre urządzenia mogą blokować ping.
            </span>
          </div>
        </div>

        {/* Komunikaty */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400"
          >
            {message}
          </div>
        )}

        {/* Wyniki skanowania */}
        <div className="mt-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-white">
              Wykryte urządzenia
            </h3>

            <div className="flex gap-2">
              <span className="rounded-lg bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                {devices.length} znalezionych
              </span>

              {hasScanned && (
                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                  {newCount} nowych
                </span>
              )}
            </div>
          </div>

          {/* Trwa skanowanie */}
          {scanning && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#342B4E] bg-[#100E20] py-12">
              <LoaderCircle
                size={28}
                className="animate-spin text-violet-400"
              />

              <p className="text-sm text-violet-300">
                Trwa wyszukiwanie urządzeń...
              </p>

              <p className="text-xs text-zinc-500">
                Sprawdzanie adresów w podsieci {network}
              </p>
            </div>
          )}

          {/* Stan początkowy */}
          {!scanning && !hasScanned && (
            <div className="rounded-xl border border-dashed border-[#342B4E] py-10 text-center">
              <ScanSearch
                size={30}
                className="mx-auto mb-3 text-violet-400/60"
              />

              <p className="text-sm text-zinc-300">
                Skanowanie nie zostało jeszcze uruchomione
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Kliknij „Skanuj sieć”, aby wykryć urządzenia.
              </p>
            </div>
          )}

          {/* Brak wyników */}
          {!scanning && hasScanned && devices.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#342B4E] py-10 text-center">
              <p className="text-sm text-zinc-400">
                Nie wykryto urządzeń odpowiadających na ping.
              </p>
            </div>
          )}

          {/* Lista znalezionych urządzeń */}
          {!scanning && devices.length > 0 && (
            <div className="space-y-3">
              {devices.map((device) => {
                const alreadyAdded = existingIps.has(
                  device.ip_address
                );

                const existing = existingDevices.find(
                  (item) =>
                    item.ip_address === device.ip_address
                );

                return (
                  <div
                    key={device.ip_address}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[#342B4E] bg-[#100E20] p-4 transition hover:border-violet-500/30"
                  >
                    <div className="rounded-xl bg-violet-500/10 p-3">
                      <Monitor
                        size={21}
                        className="text-violet-400"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {existing?.name ||
                          device.hostname ||
                          "Nieznane urządzenie"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        {device.ip_address}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Wykryto przez{" "}
                        {device.detection_method.toUpperCase()}
                      </p>
                    </div>

                    {alreadyAdded ? (
                      <span className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400">
                        <Check size={15} />
                        Dodano
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedDevice(device)}
                        disabled={loadingDevices}
                        className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                      >
                        <Plus size={16} />
                        Dodaj
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Formularz dodawania wykrytego urządzenia */}
      {selectedDevice && (
        <DeviceFormModal
          initialIp={selectedDevice.ip_address}
          initialName={selectedDevice.hostname ?? ""}
          onClose={() => setSelectedDevice(null)}
          onSaved={() => {
            void handleDeviceSaved();
          }}
        />
      )}
    </>
  );
}
