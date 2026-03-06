import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface DockerStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
}

/** Poll Docker status from the Rust backend every `intervalMs` ms. */
export function useDockerStatus(intervalMs = 3000): {
  status: DockerStatus | null;
  loading: boolean;
  refresh: () => void;
} {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    invoke<DockerStatus>("check_docker")
      .then(setStatus)
      .catch(() => setStatus({ installed: false, running: false, version: null }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { status, loading, refresh };
}
