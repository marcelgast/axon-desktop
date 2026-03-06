import { useState } from "react";
import { DockerCheck } from "./wizard/DockerCheck";
import { Disclaimer } from "./wizard/Disclaimer";
import { Starting } from "./wizard/Starting";

type Step = "docker" | "disclaimer" | "starting";

interface Props {
  onComplete: () => void;
}

const STEPS: Step[] = ["docker", "disclaimer", "starting"];
const STEP_LABELS: Record<Step, string> = {
  docker: "Docker",
  disclaimer: "Terms",
  starting: "Starting",
};

/** Multi-step setup wizard shown on first run. */
export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("docker");

  const advance = () => {
    const next = STEPS[STEPS.indexOf(step) + 1];
    if (next) setStep(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <span className="text-3xl font-bold tracking-tight">Axon</span>
          <span className="text-zinc-500 text-sm mt-1">Setup</span>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-10">
          {STEPS.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step ? "bg-axon-500" : STEPS.indexOf(s) < STEPS.indexOf(step) ? "bg-green-400" : "bg-zinc-700"
                }`}
              />
              <span className="text-xs text-zinc-500">{STEP_LABELS[s]}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === "docker" && <DockerCheck onContinue={advance} />}
        {step === "disclaimer" && <Disclaimer onAccept={advance} />}
        {step === "starting" && <Starting onReady={onComplete} />}
      </div>
    </div>
  );
}
