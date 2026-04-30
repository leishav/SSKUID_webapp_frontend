import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import starterDevices from "./data/devices.json";
import TopTabs from "./components/TopTabs";
import DeploymentsPage from "./pages/DeploymentsPage";
import DevicesPage from "./pages/DevicesPage";
import LogsPage from "./pages/LogsPage";
import ScansPage from "./pages/ScansPage";

const tabs = [
  { to: "/", label: "Devices" },
  { to: "/deployments", label: "Deployments" },
  { to: "/logs", label: "Logs" },
  { to: "/scans", label: "Scans" }
];

  // adding test comment for committing


export default function App() {
  const [devices, setDevices] = useState(starterDevices);

  return (
    <div className="app">
      <header className="header header-row">
        <div>
          <h1>SSKUID Dashboard</h1>
          <p>Simple SKUID devices</p>
        </div>
      </header>

      <TopTabs tabs={tabs} />

      <Routes>
        <Route
          path="/"
          element={<DevicesPage devices={devices} setDevices={setDevices} />}
        />
        <Route path="/deployments" element={<DeploymentsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/scans" element={<ScansPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
