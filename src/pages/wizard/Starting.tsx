import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  onReady: () => void;
}

type Phase = "starting" | "waiting" | "ready" | "error";

/** Step 3: start the Axon Docker Compose stack and wait for it to be healthy. */
export function Starting({ onReady }: Props) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startAxon();
  }, []);

  async function startAxon() {
    try {
      await invoke("start_axon");
      setPhase("waiting");
      await waitForAxon();
      setPhase("ready");
      setTimeout(onReady, 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  async function waitForAxon(attempts = 0): Promise<void> {
    if (attempts > 30) throw new Error("Axon did not start within 60 seconds.");
    try {
      const res = await fetch("http://localhost:3000/health");
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 2000));
    return waitForAxon(attempts + 1);
  }

  if (phase === "error") {
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-red-400">Failed to start</h2>
        <p className="text-zinc-300 text-sm mb-6 selectable">{error}</p>
        <button onClick={startAxon} className="btn-secondary">Retry</button>
      </div>
    );
  }

  const msg = phase === "starting" ? "Starting Axon…" : phase === "waiting" ? "Waiting for services…" : "Ready!";
  const done = phase === "ready";

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className={`w-12 h-12 rounded-full border-4 mb-6 ${done ? "border-green-400" : "border-axon-500 border-t-transparent animate-spin"}`} />
      <p className="text-zinc-200 text-lg font-medium">{msg}</p>
      {phase === "waiting" && (
        <p className="text-zinc-500 text-sm mt-2">This may take a moment on first run.</p>
      )}
    </div>
  );
}
