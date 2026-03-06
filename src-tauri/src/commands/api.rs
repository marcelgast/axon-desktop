use serde::Serialize;
use tauri::command;

const AXON_URL: &str = "http://localhost:3000";

#[derive(Serialize)]
struct SettingPayload {
    value: String,
}

/// Save a single key/value setting to the Axon backend.
///
/// Called from the setup wizard after Axon is healthy so the API is available.
#[command]
pub async fn save_setting(key: String, value: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    client
        .put(format!("{}/api/settings/{}", AXON_URL, key))
        .json(&SettingPayload { value })
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
struct LlmProviderPayload {
    name: String,
    #[serde(rename = "type")]
    provider_type: String,
    base_url: Option<String>,
    api_key: String,
}

/// Create an LLM provider entry in the Axon backend.
///
/// Called from the setup wizard's LLM step. `base_url` is only set for
/// custom / local providers (e.g. Ollama). `api_key` is empty for providers
/// that don't require one (e.g. Ollama running locally).
#[command]
pub async fn create_llm_provider(
    name: String,
    provider_type: String,
    base_url: Option<String>,
    api_key: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    client
        .post(format!("{}/api/llm-providers", AXON_URL))
        .json(&LlmProviderPayload {
            name,
            provider_type,
            base_url,
            api_key,
        })
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    Ok(())
}
