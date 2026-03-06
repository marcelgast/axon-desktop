import { invoke } from "@tauri-apps/api/core";
import { StatsBar } from "../components/StatsBar";
import { StatusBadge } from "../components/StatusBadge";
import { useAxonStatus } from "../hooks/useAxonStatus";
import { useContainerStats } from "../hooks/useContainerStats";

const AXON_URL = "http://localhost:3000";

/** Main dashboard view — shows the Axon web UI in an iframe after setup. */
export function Dashboard() {
  const { status } = useAxonStatus();
  const state = status?.state ?? "checking";
  const running = state === "running";

  const stats = useContainerStats(running);

  const handleStop = () => invoke("stop_axon");
  const handleStart = () => invoke("start_axon");

  return (
    <div className="flex flex-col h-screen">
      {/* Thin toolbar */}
      <div className="flex items-center justify-between px-4 h-9 bg-axon-800 border-b border-axon-line shrink-0">
        <span className="text-sm font-medium text-zinc-200">Axon</span>
        <div className="flex items-center gap-4">
          <StatusBadge state={state} />
          {running ? (
            <button
              onClick={handleStop}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Start
            </button>
          )}
        </div>
      </div>

      {/* Axon dashboard in iframe */}
      {running ? (
        <iframe
          src={AXON_URL}
          className="flex-1 w-full border-0 bg-white"
          title="Axon Dashboard"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          <div className="text-center">
            <p className="mb-3">Axon is not running.</p>
            <button onClick={handleStart} className="btn-primary text-sm">
              Start Axon
            </button>
          </div>
        </div>
      )}

      {/* Per-container CPU + memory — visible only when running */}
      <StatsBar stats={stats} />
    </div>
  );
}
