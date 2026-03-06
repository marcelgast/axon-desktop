import { useState, useEffect } from "react";
import { SetupWizard } from "./pages/SetupWizard";
import { Dashboard } from "./pages/Dashboard";

type AppState = "loading" | "setup" | "dashboard";

const SETUP_KEY = "axon_setup_complete";

/**
 * Root component.
 * On first launch → setup wizard (Docker check + disclaimer + start).
 * After setup completes → embedded Axon dashboard (iframe).
 */
export default function App() {
  const [appState, setState] = useState<AppState>("loading");

  useEffect(() => {
    const done = localStorage.getItem(SETUP_KEY) === "true";
    setState(done ? "dashboard" : "setup");
  }, []);

  const handleSetupComplete = () => {
    localStorage.setItem(SETUP_KEY, "true");
    setState("dashboard");
  };

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-axon-900">
        <div className="w-8 h-8 rounded-full border-2 border-axon-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (appState === "setup") {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return <Dashboard />;
}
