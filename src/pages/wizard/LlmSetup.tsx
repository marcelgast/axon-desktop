import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  onContinue: () => void;
}

type Provider = {
  id: string;
  label: string;
  type: string;
  /** Shown in the API key field as placeholder text. */
  placeholder: string;
  /** Pre-filled base URL for local providers; null for cloud APIs. */
  baseUrl: string | null;
  /** True for local providers — API key field becomes base URL field. */
  isLocal: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    type: "anthropic",
    placeholder: "sk-ant-api03-…",
    baseUrl: null,
    isLocal: false,
  },
  {
    id: "openai",
    label: "OpenAI",
    type: "openai",
    placeholder: "sk-proj-…",
    baseUrl: null,
    isLocal: false,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    type: "gemini",
    placeholder: "AIzaSy…",
    baseUrl: null,
    isLocal: false,
  },
  {
    id: "mistral",
    label: "Mistral",
    type: "mistral",
    placeholder: "…",
    baseUrl: null,
    isLocal: false,
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    type: "ollama",
    placeholder: "http://localhost:11434",
    baseUrl: "http://localhost:11434",
    isLocal: true,
  },
];

/** Step 5: Connect an LLM provider. No default — user picks explicitly. */
export function LlmSetup({ onContinue }: Props) {
  const [providerId, setProviderId] = useState<string>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = PROVIDERS.find((p) => p.id === providerId)!;

  function selectProvider(id: string) {
    setProviderId(id);
    setApiKey("");
    setError(null);
  }

  async function handleConnect() {
    setSaving(true);
    setError(null);
    try {
      await invoke("create_llm_provider", {
        name: provider.label,
        providerType: provider.type,
        baseUrl: provider.isLocal ? (apiKey.trim() || provider.baseUrl) : null,
        apiKey: provider.isLocal ? "" : apiKey.trim(),
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
      <h2 className="text-2xl font-semibold mb-2">Connect an LLM</h2>
      <p className="text-zinc-400 text-sm mb-8">
        Choose your AI provider. No default is set — you decide. Add more providers
        in the dashboard later.
      </p>

      {/* Provider grid */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectProvider(p.id)}
            className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
              providerId === p.id
                ? "border-axon-500 bg-axon-500/10 text-white"
                : "border-axon-line bg-axon-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Key / URL input */}
      <div className="mb-8">
        <label className="block text-sm text-zinc-400 mb-1">
          {provider.isLocal ? "Base URL" : "API Key"}
        </label>
        <input
          className="w-full bg-axon-800 border border-axon-line rounded-lg px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-axon-500 font-mono text-sm"
          type={provider.isLocal ? "url" : "password"}
          placeholder={provider.placeholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        {provider.isLocal && (
          <p className="text-zinc-600 text-xs mt-1">
            Leave blank to use the default ({provider.baseUrl})
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => void handleConnect()}
          disabled={(!provider.isLocal && !apiKey.trim()) || saving}
          className="btn-primary"
        >
          {saving ? "Connecting…" : "Connect"}
        </button>
        <button onClick={onContinue} className="btn-secondary">
          Skip for now
        </button>
      </div>
    </div>
  );
}
