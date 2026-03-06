/// Docker and Axon lifecycle commands.
///
/// All docker interactions go through the Docker CLI — the Tauri process
/// never gains access to the Docker socket itself.  Commands are invoked
/// via `std::process::Command` and results are returned as structured data
/// to the frontend.
use std::process::Command;

use serde::Serialize;

#[derive(Serialize)]
pub struct DockerStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
}

#[derive(Serialize)]
pub struct AxonStatus {
    pub state: String, // "running" | "stopped" | "starting" | "error"
    pub containers: Vec<String>,
}

/// Check whether Docker is installed and the daemon is running.
#[tauri::command]
pub fn check_docker() -> DockerStatus {
    let version = get_docker_version();
    let installed = version.is_some();
    let running = installed && is_docker_running();
    DockerStatus { installed, running, version }
}

fn get_docker_version() -> Option<String> {
    let output = Command::new("docker")
        .args(["version", "--format", "{{.Server.Version}}"])
        .output()
        .ok()?;
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

fn is_docker_running() -> bool {
    Command::new("docker")
        .arg("info")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Start the Axon stack via `docker compose up -d`.
#[tauri::command]
pub fn start_axon() -> Result<(), String> {
    let status = Command::new("docker")
        .args(["compose", "-f", axon_compose_path().as_str(), "up", "-d"])
        .status()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("docker compose up failed — check Docker is running".into())
    }
}

/// Stop the Axon stack via `docker compose down`.
#[tauri::command]
pub fn stop_axon() -> Result<(), String> {
    let status = Command::new("docker")
        .args(["compose", "-f", axon_compose_path().as_str(), "down"])
        .status()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("docker compose down failed".into())
    }
}

/// Query running Axon containers.
#[tauri::command]
pub fn get_axon_status() -> AxonStatus {
    let output = Command::new("docker")
        .args(["ps", "--filter", "name=axon-", "--format", "{{.Names}}"])
        .output();

    match output {
        Err(_) => AxonStatus { state: "error".into(), containers: vec![] },
        Ok(out) => {
            let names: Vec<String> = String::from_utf8_lossy(&out.stdout)
                .lines()
                .filter(|l| !l.is_empty())
                .map(str::to_string)
                .collect();
            let state = if names.is_empty() { "stopped" } else { "running" }.into();
            AxonStatus { state, containers: names }
        }
    }
}

/// Returns the path to the bundled docker-compose.yml.
/// Falls back to a default path for development.
fn axon_compose_path() -> String {
    // In production, the compose file is bundled next to the binary.
    // In development, assume repo root relative to cwd.
    std::env::var("AXON_COMPOSE_PATH")
        .unwrap_or_else(|_| "docker-compose.yml".to_string())
}
