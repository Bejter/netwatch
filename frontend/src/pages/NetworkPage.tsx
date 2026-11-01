
import NetworkMap from "../components/dashboard/NetworkMap";

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Mapa sieci
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Monitoruj dostępność urządzeń w swojej sieci lokalnej
        </p>
      </div>

      <NetworkMap fullPage />
    </div>
  );
}
