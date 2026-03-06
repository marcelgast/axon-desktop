import { useDockerStatus } from "../../hooks/useDockerStatus";

interface Props {
  onContinue: () => void;
}

/** Step 1 of the setup wizard: verify Docker is installed and running. */
export function DockerCheck({ onContinue }: Props) {
  const { status, loading, refresh } = useDockerStatus(2000);

  if (loading) {
    return <StepShell title="Checking Docker…" />;
  }

  if (!status?.installed) {
    return (
      <StepShell title="Docker not found">
        <p className="text-zinc-300 mb-6">
          Axon requires Docker to run its agents. Please install Docker Desktop
          and start it, then click Retry.
        </p>
        <a
          href="https://docs.docker.com/get-docker/"
          className="text-axon-500 underline text-sm mb-6 block"
          target="_blank"
          rel="noreferrer"
        >
          → Download Docker Desktop
        </a>
        <button onClick={refresh} className="btn-secondary">
          Retry
        </button>
      </StepShell>
    );
  }

  if (!status.running) {
    return (
      <StepShell title="Docker is not running">
        <p className="text-zinc-300 mb-6">
          Docker is installed but the daemon is not running.
          Please start Docker Desktop and click Retry.
        </p>
        <button onClick={refresh} className="btn-secondary">
          Retry
        </button>
      </StepShell>
    );
  }

  return (
    <StepShell title="Docker is ready ✓">
      <p className="text-zinc-300 mb-2">
        Docker {status.version} is installed and running.
      </p>
      <p className="text-zinc-500 text-sm mb-8">
        Axon will use Docker to run its agents in isolated containers.
      </p>
      <button onClick={onContinue} className="btn-primary">
        Continue
      </button>
    </StepShell>
  );
}

function StepShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
