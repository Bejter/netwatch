import { useState } from "react";

import NetworkMap from "../components/dashboard/NetworkMap";
import NetworkDiscovery from "../components/network/NetworkDiscovery";

export default function NetworkPage() {
  const [mapVersion, setMapVersion] = useState(0);

  function handleDeviceAdded() {
    setMapVersion((previous) => previous + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Mapa sieci
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Wykrywaj urządzenia i monitoruj swoją sieć lokalną
        </p>
      </div>

      <NetworkDiscovery onDeviceAdded={handleDeviceAdded} />

      <NetworkMap key={mapVersion} fullPage />
    </div>
  );
}
