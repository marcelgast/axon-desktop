/// Docker and Axon lifecycle commands.
///
/// All docker interactions go through the Docker CLI — the Tauri process
/// never gains access to the Docker socket itself.  Commands are invoked
/// via `std::process::Command` and results are returned as structured data
/// to the frontend.
use std::process::Command;
use std::{fs, io::Write, path::Path};

use rand::RngCore;
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
    DockerStatus {
        installed,
        running,
        version,
    }
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

/// Resolve or create a persistent secret key for the bundled compose stack.
fn resolve_secret_key(app: &tauri::AppHandle) -> Result<String, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Cannot locate app config directory: {e}"))?;

    fs::create_dir_all(&config_dir).map_err(|e| {
        format!(
            "Cannot create app config directory '{}': {e}",
            config_dir.display()
        )
    })?;

    let key_path = config_dir.join("secret.key");

    if let Some(existing) = read_secret_key(&key_path)? {
        return Ok(existing);
    }

    let mut bytes = [0_u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    let secret = bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();

    let mut file = fs::File::create(&key_path).map_err(|e| {
        format!(
            "Cannot create secret key file '{}': {e}",
            key_path.display()
        )
    })?;
    file.write_all(secret.as_bytes())
        .map_err(|e| format!("Cannot write secret key file '{}': {e}", key_path.display()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = fs::Permissions::from_mode(0o600);
        let _ = fs::set_permissions(&key_path, perms);
    }

    Ok(secret)
}

fn read_secret_key(path: &Path) -> Result<Option<String>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let value = fs::read_to_string(path)
        .map_err(|e| format!("Cannot read secret key file '{}': {e}", path.display()))?
        .trim()
        .to_string();
    if value.is_empty() {
        return Ok(None);
    }
    Ok(Some(value))
}

/// Start the Axon stack via `docker compose up -d`.
#[tauri::command]
pub fn start_axon(app: tauri::AppHandle) -> Result<(), String> {
    let compose_path = resolve_compose_path(&app)?;
    let secret_key = resolve_secret_key(&app)?;

    let output = Command::new("docker")
        .env("SECRET_KEY", &secret_key)
        .args(["compose", "-f", &compose_path, "up", "-d"])
        .output()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err("docker compose up failed — check Docker is running".into())
        } else {
            Err(format!("docker compose up failed: {stderr}"))
        }
    }
}

/// Stop the Axon stack via `docker compose down`.
#[tauri::command]
pub fn stop_axon(app: tauri::AppHandle) -> Result<(), String> {
    let compose_path = resolve_compose_path(&app)?;
    let secret_key = resolve_secret_key(&app)?;

    let output = Command::new("docker")
        .env("SECRET_KEY", &secret_key)
        .args(["compose", "-f", &compose_path, "down"])
        .output()
        .map_err(|e| format!("Failed to run docker compose: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err("docker compose down failed".into())
        } else {
            Err(format!("docker compose down failed: {stderr}"))
        }
    }
}

/// Check whether the Axon HTTP service is ready to accept connections.
///
/// Uses the exact compose stack configured for this app.
/// Tries Docker container health first; falls back to a local TCP check only
/// when the compose stack is running but has no healthcheck configured.
/// Running this check in Rust avoids browser CORS restrictions.
#[tauri::command]
pub fn check_axon_health(app: tauri::AppHandle) -> bool {
    let compose_path = match resolve_compose_path(&app) {
        Ok(path) => path,
        Err(_) => return false,
    };

    let container_ids = match list_compose_container_ids(&compose_path) {
        Ok(ids) if !ids.is_empty() => ids,
        _ => return false,
    };

    match compose_health_state(&container_ids) {
        ComposeHealthState::Healthy => true,
        ComposeHealthState::RunningWithoutHealthcheck => port_is_open(3000),
        ComposeHealthState::NotRunningOrErrored => false,
    }
}

fn list_compose_container_ids(compose_path: &str) -> Result<Vec<String>, String> {
    Command::new("docker")
        .args(["compose", "-f", compose_path, "ps", "-q"])
        .output()
        .map_err(|e| format!("Failed to list compose containers: {e}"))
        .and_then(parse_compose_ps_output)
}

fn parse_compose_ps_output(output: std::process::Output) -> Result<Vec<String>, String> {
    parse_compose_ps_fields(
        output.status.success(),
        &String::from_utf8_lossy(&output.stdout),
        &String::from_utf8_lossy(&output.stderr),
    )
}

fn parse_compose_ps_fields(
    success: bool,
    stdout: &str,
    stderr: &str,
) -> Result<Vec<String>, String> {
    if !success {
        return Err(stderr.trim().to_string());
    }

    Ok(stdout
        .lines()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(str::to_string)
        .collect())
}

#[derive(Debug, PartialEq, Eq)]
enum ComposeHealthState {
    Healthy,
    RunningWithoutHealthcheck,
    NotRunningOrErrored,
}

fn compose_health_state(container_ids: &[String]) -> ComposeHealthState {
    let mut any_running = false;
    let mut any_inspect_ok = false;

    for id in container_ids {
        let output = Command::new("docker")
            .args([
                "inspect",
                "--format",
                "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
                id,
            ])
            .output();

        let Ok(out) = output else {
            continue;
        };
        if !out.status.success() {
            continue;
        }

        any_inspect_ok = true;
        let status = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if status == "healthy" {
            return ComposeHealthState::Healthy;
        }
        if status == "running" {
            any_running = true;
        }
    }

    if any_running {
        ComposeHealthState::RunningWithoutHealthcheck
    } else if any_inspect_ok {
        ComposeHealthState::NotRunningOrErrored
    } else {
        ComposeHealthState::NotRunningOrErrored
    }
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
pub fn get_axon_status(app: tauri::AppHandle) -> AxonStatus {
    let compose_path = match resolve_compose_path(&app) {
        Ok(path) => path,
        Err(_) => {
            return AxonStatus {
                state: "error".into(),
                containers: vec![],
            }
        }
    };

    let output = Command::new("docker")
        .args([
            "compose",
            "-f",
            &compose_path,
            "ps",
            "--status",
            "running",
            "--format",
            "{{.Name}}",
        ])
        .output();

    match output {
        Err(_) => AxonStatus {
            state: "error".into(),
            containers: vec![],
        },
        Ok(out) => {
            if !out.status.success() {
                return AxonStatus {
                    state: "error".into(),
                    containers: vec![],
                };
            }
            let names: Vec<String> = String::from_utf8_lossy(&out.stdout)
                .lines()
                .map(str::trim)
                .filter(|l| !l.is_empty())
                .map(str::to_string)
                .collect();
            let state = if names.is_empty() {
                "stopped"
            } else {
                "running"
            }
            .into();
            AxonStatus {
                state,
                containers: names,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_compose_ps_fields, AxonStatus, ComposeHealthState};

    #[test]
    fn parses_container_ids_from_compose_ps() {
        let ids = parse_compose_ps_fields(true, "abc123\n\ndef456\n", "").expect("expected ids");
        assert_eq!(ids, vec!["abc123".to_string(), "def456".to_string()]);
    }

    #[test]
    fn compose_ps_parse_fails_on_non_zero_exit() {
        let err = parse_compose_ps_fields(false, "", "compose failed").expect_err("expected error");
        assert_eq!(err, "compose failed");
    }

    #[test]
    fn axon_status_shape_supports_error_state() {
        let status = AxonStatus {
            state: "error".into(),
            containers: vec![],
        };
        assert_eq!(status.state, "error");
    }

    #[test]
    fn compose_health_state_values_are_stable() {
        assert_ne!(
            ComposeHealthState::Healthy,
            ComposeHealthState::NotRunningOrErrored
        );
    }
}
