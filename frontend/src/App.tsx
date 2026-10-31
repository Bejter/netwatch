import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/layout/sidebar";
import Header from "./components/layout/Header";
import DashboardPage from "./pages/DashboardPage";

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-zinc-400">
        NetWatch – panel monitorowania sieci
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0B0B15] text-white">
        <Sidebar />

        
        <main className="min-w-0 flex-1 p-6 lg:p-8">
          <Header />

          <div className="mt-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/devices" element={<Placeholder title="Urządzenia" />} />
              <Route path="/network" element={<Placeholder title="Mapa sieci" />} />
              <Route path="/monitoring" element={<Placeholder title="Monitoring" />} />
              <Route path="/charts" element={<Placeholder title="Wykresy" />} />
              <Route path="/alerts" element={<Placeholder title="Alerty" />} />
              <Route path="/settings" element={<Placeholder title="Ustawienia" />} />
            </Routes>
          </div>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;
