/// Docker and Axon lifecycle commands.
///
/// All docker interactions go through the Docker CLI — the Tauri process
/// never gains access to the Docker socket itself.  Commands are invoked
/// via `std::process::Command` and results are returned as structured data
/// to the frontend.
use std::process::Command;

use serde::Serialize;
use tauri::Manager;

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

/// Resolve the path to the bundled docker-compose.yml.
///
/// In dev mode, `AXON_COMPOSE_PATH` env var overrides the default so you
/// can point at the axon repo's compose file without packaging it.
/// In production the compose file is bundled alongside the binary.
fn resolve_compose_path(app: &tauri::AppHandle) -> Result<String, String> {
    if let Ok(path) = std::env::var("AXON_COMPOSE_PATH") {
        return Ok(path);
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Cannot locate resource directory: {e}"))?;

    let compose = resource_dir.join("docker-compose.yml");
    Ok(compose.to_string_lossy().into_owned())
}

/// Start the Axon stack via `docker compose up -d`.
#[tauri::command]
pub fn start_axon(app: tauri::AppHandle) -> Result<(), String> {
    let compose_path = resolve_compose_path(&app)?;

    let status = Command::new("docker")
        .args(["compose", "-f", &compose_path, "up", "-d"])
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
pub fn stop_axon(app: tauri::AppHandle) -> Result<(), String> {
    let compose_path = resolve_compose_path(&app)?;

    let status = Command::new("docker")
        .args(["compose", "-f", &compose_path, "down"])
        .status()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if status.success() {
        Ok(())
    } else {
        Err("docker compose down failed".into())
    }
}

/// Check whether the Axon HTTP service is ready to accept connections.
///
/// Tries the Docker health filter first (no network needed — fast).
/// Falls back to a TCP connect attempt for images without a healthcheck.
/// Running this check in Rust avoids browser CORS restrictions.
#[tauri::command]
pub fn check_axon_health() -> bool {
    is_any_service_healthy() || port_is_open(3000) || port_is_open(8000)
}

/// Returns true if at least one `axon-*` container reports health=healthy.
fn is_any_service_healthy() -> bool {
    Command::new("docker")
        .args([
            "ps",
            "--filter", "name=axon-",
            "--filter", "health=healthy",
            "--format", "{{.Names}}",
        ])
        .output()
        .ok()
        .map(|o| !String::from_utf8_lossy(&o.stdout).trim().is_empty())
        .unwrap_or(false)
}

/// Returns true if the given localhost port accepts a TCP connection.
fn port_is_open(port: u16) -> bool {
    use std::net::{SocketAddr, TcpStream};
    use std::time::Duration;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_secs(1)).is_ok()
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
