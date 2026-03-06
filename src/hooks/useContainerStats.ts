import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export type ContainerStat = {
  name: string;
  cpu: string;
  memory: string;
};

/**
 * Poll `get_container_stats` every `intervalMs` while `enabled` is true.
 * Returns an empty array when the stack is stopped or not yet available.
 */
export function useContainerStats(
  enabled: boolean,
  intervalMs = 5000,
): ContainerStat[] {
  const [stats, setStats] = useState<ContainerStat[]>([]);

  useEffect(() => {
    if (!enabled) {
      setStats([]);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const result = await invoke<ContainerStat[]>("get_container_stats");
        if (!cancelled) setStats(result);
      } catch {
        // Non-fatal: stats may not be available immediately after start.
      }
    }

    void poll();
    const id = setInterval(() => void poll(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);

  return stats;
}
