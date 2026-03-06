import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface AxonStatus {
  state: "running" | "stopped" | "error";
  containers: string[];
}

/** Poll the Axon container status every `intervalMs` ms. */
export function useAxonStatus(intervalMs = 4000): {
  status: AxonStatus | null;
  refresh: () => void;
} {
  const [status, setStatus] = useState<AxonStatus | null>(null);

  const refresh = () => {
    invoke<AxonStatus>("get_axon_status")
      .then(setStatus)
      .catch(() =>
        setStatus({ state: "error", containers: [] })
      );
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { status, refresh };
}
