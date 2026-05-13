import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import starterDevices from "./data/devices.json";
import TopTabs from "./components/TopTabs";
import DeploymentsPage from "./pages/DeploymentsPage";
import DevicesPage from "./pages/DevicesPage";
import LogsPage from "./pages/LogsPage";
import ScansPage from "./pages/ScansPage";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

const tabs = [
  { to: "/", label: "Devices" },
  { to: "/deployments", label: "Deployments" },
  { to: "/logs", label: "Logs" },
  { to: "/scans", label: "Scans" },
];

const THEME_KEY = "theme";
function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function App() {
  const [devices, setDevices] = useState(starterDevices);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="auth-wrapper">
      <Authenticator>
        {({ signOut, user }) => (
          <div className="app">
            <header className="header header-row flex items-start justify-between gap-4">
              <div>
                <h1>Simple SKUID Dashboard</h1>
              </div>

              <div className="flex gap-2">
                {/* Sign out button */}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={signOut}
                >
                  Sign Out ({user.username})
                </button>

                {/* theme toggle */}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                >
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
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
        )}
      </Authenticator>
    </div>
  );
}