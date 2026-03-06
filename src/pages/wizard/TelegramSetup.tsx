import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  onContinue: () => void;
}

/** Step 6 (optional): Connect a Telegram bot for mobile access. */
export function TelegramSetup({ onContinue }: Props) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!token.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await invoke("save_setting", {
        key: "telegram_bot_token",
        value: token.trim(),
      });
      onContinue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Telegram (optional)</h2>
      <p className="text-zinc-400 text-sm mb-2">
        Chat with Axon from your phone via Telegram. Create a bot with{" "}
        <span className="text-axon-500 font-mono">@BotFather</span> and paste
        the token here.
      </p>
      <p className="text-zinc-600 text-xs mb-8">
        This is completely optional — skip it and set it up later in Settings.
      </p>

      <div className="mb-8">
        <label className="block text-sm text-zinc-400 mb-1">Bot Token</label>
        <input
          className="w-full bg-axon-800 border border-axon-line rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-axon-500 font-mono text-sm"
          placeholder="123456789:ABCdef…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => void handleConnect()}
          disabled={!token.trim() || saving}
          className="btn-primary"
        >
          {saving ? "Connecting…" : "Connect"}
        </button>
        <button onClick={onContinue} className="btn-secondary">
          Skip — set up later
        </button>
      </div>
    </div>
  );
}
