import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  onContinue: () => void;
}

/** Step 4: Give the assistant a name and personality description. */
export function PersonaSetup({ onContinue }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await invoke("save_setting", { key: "persona_name", value: name.trim() });
      if (description.trim()) {
        await invoke("save_setting", {
          key: "persona_description",
          value: description.trim(),
        });
      }
      onContinue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Name your assistant</h2>
      <p className="text-zinc-400 text-sm mb-8">
        Give Axon a name and personality. This shapes how it talks to you.
        You can change it anytime in the dashboard.
      </p>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Name</label>
          <input
            className="w-full bg-axon-800 border border-axon-line rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-axon-500"
            placeholder="Axon"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Personality</label>
          <textarea
            className="w-full bg-axon-800 border border-axon-line rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-axon-500 resize-none"
            rows={3}
            placeholder="Professional, concise, and direct. Gets straight to the point."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={!name.trim() || saving}
          className="btn-primary"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
        <button onClick={onContinue} className="btn-secondary">
          Skip for now
        </button>
      </div>
    </div>
  );
}
