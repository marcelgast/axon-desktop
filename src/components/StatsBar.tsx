import type { ContainerStat } from "../hooks/useContainerStats";

interface Props {
  stats: ContainerStat[];
}

/**
 * Thin bottom bar showing CPU and memory usage for each Axon container.
 * Hidden when `stats` is empty (stack stopped or not yet ready).
 */
export function StatsBar({ stats }: Props) {
  if (stats.length === 0) return null;

  return (
    <div className="flex gap-6 px-4 h-7 bg-axon-800 border-t border-axon-line items-center overflow-x-auto shrink-0">
      {stats.map((s) => (
        <div
          key={s.name}
          className="flex items-center gap-2 text-xs text-zinc-500 whitespace-nowrap"
        >
          <span className="text-zinc-400 font-mono">{shortName(s.name)}</span>
          <span>{s.cpu}</span>
          <span className="text-zinc-700">·</span>
          {/* Show only the "used" half of "128MiB / 16GiB" */}
          <span>{s.memory.split(" / ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Strip the compose project prefix and replica suffix.
 * "axon-master-1" → "master", "axon-redis-1" → "redis".
 */
function shortName(name: string): string {
  const parts = name.split("-");
  if (parts.length >= 3) return parts.slice(1, -1).join("-");
  return name;
}
