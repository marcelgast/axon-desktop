import { useState } from "react";

interface Props {
  onAccept: () => void;
}

const DISCLAIMER = `Axon is provided "as is" without warranty of any kind. The authors are not responsible for any damage, data loss, unwanted actions, costs, legal issues, or any other consequences arising from the use of this software or any plugins, agents, or integrations configured by the user. Use at your own risk.

The user is solely responsible for ensuring compliance with all applicable local, national, and international laws, including but not limited to laws regarding adult content, data privacy, and automated systems.`;

/** Step 2: show the required disclaimer and get explicit acceptance. */
export function Disclaimer({ onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-semibold mb-4">Before you continue</h2>
      <div className="bg-zinc-800 rounded-lg p-4 mb-6 selectable overflow-y-auto max-h-48 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
        {DISCLAIMER}
      </div>

      <label className="flex items-start gap-3 mb-8 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 accent-axon-500"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span className="text-sm text-zinc-300">
          I have read and understood the disclaimer and accept the risks.
        </span>
      </label>

      <button
        onClick={onAccept}
        disabled={!accepted}
        className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Accept & Continue
      </button>
    </div>
  );
}
