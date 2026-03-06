interface Props {
  state: "running" | "stopped" | "error" | "checking";
}

const CONFIG = {
  running: { dot: "bg-green-400", label: "Running" },
  stopped: { dot: "bg-zinc-500",  label: "Stopped" },
  error:   { dot: "bg-red-400",   label: "Error"   },
  checking:{ dot: "bg-yellow-400 animate-pulse", label: "Checking…" },
};

/** Small coloured dot + label showing the current Axon stack state. */
export function StatusBadge({ state }: Props) {
  const { dot, label } = CONFIG[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-zinc-300">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
