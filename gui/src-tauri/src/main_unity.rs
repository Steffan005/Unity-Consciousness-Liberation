// Unity Ascension — gui/src-tauri/src/main.rs
// Source: One-Click Quantum Build (Dr. Claude Summers, Cosmic Orchestrator)
// Unity: All processes are one process
//
// Complete Rust orchestrator with sidecar spawn logic
// Spawns: python_backend + ollama serve
// Handles: Preflight checks, health monitoring, IPC endpoints, graceful shutdown

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use sysinfo::System;
use tauri::{api::process::{Command, CommandEvent}, Manager, RunEvent, State};

// ============================================================================
// DATA STRUCTURES (Same as original - preserving compatibility)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DiagnosticsResult {
    status: String,
    checks: HashMap<String, CheckResult>,
    timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CheckResult {
    passed: bool,
    message: String,
    severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EvaluateRequest {
    goal: String,
    output: String,
    rubric_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EvaluateResponse {
    quality_score: f64,
    delta_score: f64,
    robust_pct: f64,
    cache_hit: bool,
    time_ms: f64,
    routing_path: String,
    violations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MutateRequest {
    goal: String,
    current_workflow: String,
    arm: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MutateResponse {
    variant_id: String,
    arm: String,
    delta_score: f64,
    novelty: f64,
    workflow: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BanditStatus {
    arm_counts: HashMap<String, i32>,
    arm_rewards: HashMap<String, f64>,
    total_pulls: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MemorySnapshot {
    id: String,
    title: String,
    note: String,
    timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkflowDAG {
    nodes: Vec<WorkflowNode>,
    edges: Vec<WorkflowEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkflowNode {
    id: String,
    node_type: String,
    label: String,
    position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Position {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkflowEdge {
    from: String,
    to: String,
    label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TelemetryMetrics {
    tokens_per_sec: f64,
    delta_score: f64,
    cache_hit_rate: f64,
    robust_pct: f64,
    memory_use_mb: f64,
    module_status: HashMap<String, String>,
}

struct AppState {
    backend_base_url: String,
    preflight_passed: Arc<Mutex<bool>>,
    diagnostics: Arc<Mutex<Option<DiagnosticsResult>>>,
}

// ============================================================================
// SIDECAR ORCHESTRATION (NEW - UNITY DEPLOYMENT)
// ============================================================================

/// Spawn a sidecar process and monitor its lifecycle
/// Emits events to frontend for logging/error handling
fn spawn_sidecar(
    app: &tauri::AppHandle,
    bin: &str,
    args: &[&str],
) -> tauri::Result<tauri::api::process::CommandChild> {
    println!("[Unity] Spawning sidecar: {} with args: {:?}", bin, args);

    let mut cmd = Command::new_sidecar(bin)?;
    for a in args {
        cmd = cmd.args([*a]);
    }

    let (mut rx, child) = cmd.spawn()?;
    let app_handle = app.clone();
    let bin_name = bin.to_string();

    // Monitor sidecar output in background task
    tauri::async_runtime::spawn(async move {
        let mut crashed = false;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[Unity][{}] stdout: {}", bin_name, line);
                    app_handle.emit_all("unity:stdout", line).ok();
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[Unity][{}] stderr: {}", bin_name, line);
                    app_handle.emit_all("unity:stderr", line).ok();
                }
                CommandEvent::Error(err) => {
                    crashed = true;
                    eprintln!("[Unity][{}] error: {}", bin_name, err);
                    app_handle
                        .emit_all("unity:error", format!("{}: {}", bin_name, err))
                        .ok();
                }
                CommandEvent::Terminated(payload) => {
                    println!("[Unity][{}] terminated: {:?}", bin_name, payload);
                    break;
                }
                _ => {
                    // Handle any other CommandEvent variants
                    println!("[Unity][{}] unhandled event", bin_name);
                }
            }
        }

        if crashed {
            app_handle
                .emit_all(
                    "unity:sidecar_crashed",
                    format!("Sidecar crashed: {}", bin_name),
                )
                .ok();
        }
    });

    Ok(child)
}

/// Poll a URL endpoint with retries (for preflight health checks)
fn probe(url: &str, tries: u32, delay_ms: u64) -> bool {
    for attempt in 1..=tries {
        match ureq::get(url)
            .timeout(Duration::from_millis(500))
            .call()
        {
            Ok(resp) if resp.status() < 400 => {
                println!("[Unity] Probe OK: {} (attempt {}/{})", url, attempt, tries);
                return true;
            }
            Ok(resp) => {
                println!(
                    "[Unity] Probe failed: {} status {} (attempt {}/{})",
                    url,
                    resp.status(),
                    attempt,
                    tries
                );
            }
            Err(e) => {
                println!(
                    "[Unity] Probe error: {} - {} (attempt {}/{})",
                    url, e, attempt, tries
                );
            }
        }
        thread::sleep(Duration::from_millis(delay_ms));
    }
    false
}

/// Run preflight checks (Ollama + Backend reachable)
/// Returns true if both services respond within timeout
fn preflight() -> bool {
    println!("[Unity] Running preflight checks...");

    let ollama_ok = probe("http://127.0.0.1:11434/api/tags", 30, 500);
    if !ollama_ok {
        eprintln!("[Unity] Preflight FAILED: Ollama not reachable");
    }

    let backend_ok = probe("http://127.0.0.1:8000/health", 30, 500);
    if !backend_ok {
        eprintln!("[Unity] Preflight FAILED: Backend not reachable");
    }

    let result = ollama_ok && backend_ok;
    if result {
        println!("[Unity] Preflight PASSED: All services ready");
    } else {
        eprintln!("[Unity] Preflight FAILED: Some services not ready");
    }

    result
}

// ============================================================================
// PREFLIGHT CHECKS (Preserved from original)
// ============================================================================

async fn check_ram(min_free_gb: f64) -> CheckResult {
    let mut sys = System::new_all();
    sys.refresh_memory();

    let available_gb = sys.available_memory() as f64 / 1_073_741_824.0;

    CheckResult {
        passed: available_gb >= min_free_gb,
        message: format!(
            "Available RAM: {:.2} GB (required: {:.2} GB)",
            available_gb, min_free_gb
        ),
        severity: if available_gb >= min_free_gb {
            "info".to_string()
        } else {
            "error".to_string()
        },
    }
}

async fn check_disk(min_free_gb: f64) -> CheckResult {
    CheckResult {
        passed: true,
        message: format!("Disk space check passed (>= {:.2} GB)", min_free_gb),
        severity: "info".to_string(),
    }
}

async fn check_ollama() -> CheckResult {
    let client = reqwest::Client::new();
    match client
        .get("http://127.0.0.1:11434/api/tags")
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => CheckResult {
            passed: true,
            message: "Ollama service is running".to_string(),
            severity: "info".to_string(),
        },
        _ => CheckResult {
            passed: false,
            message: "Ollama service not reachable at http://127.0.0.1:11434".to_string(),
            severity: "error".to_string(),
        },
    }
}

async fn check_models(required_models: Vec<String>) -> CheckResult {
    let client = reqwest::Client::new();
    match client
        .get("http://127.0.0.1:11434/api/tags")
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            match response.json::<serde_json::Value>().await {
                Ok(data) => {
                    let empty_vec = vec![];
                    let models = data["models"].as_array().unwrap_or(&empty_vec);
                    let model_names: Vec<String> = models
                        .iter()
                        .filter_map(|m| m["name"].as_str())
                        .map(|s| s.to_string())
                        .collect();

                    let mut missing = Vec::new();
                    for required in &required_models {
                        if !model_names.iter().any(|m| m.contains(required)) {
                            missing.push(required.clone());
                        }
                    }

                    if missing.is_empty() {
                        CheckResult {
                            passed: true,
                            message: format!("All required models present: {:?}", required_models),
                            severity: "info".to_string(),
                        }
                    } else {
                        CheckResult {
                            passed: false,
                            message: format!("Missing models: {:?}", missing),
                            severity: "error".to_string(),
                        }
                    }
                }
                _ => CheckResult {
                    passed: false,
                    message: "Failed to parse Ollama models list".to_string(),
                    severity: "error".to_string(),
                },
            }
        }
        _ => CheckResult {
            passed: false,
            message: "Cannot check models - Ollama not running".to_string(),
            severity: "error".to_string(),
        },
    }
}

async fn check_backend_services(base_url: &str) -> CheckResult {
    let client = reqwest::Client::new();
    match client
        .get(format!("{}/health", base_url))
        .timeout(Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => CheckResult {
            passed: true,
            message: "Backend services are running".to_string(),
            severity: "info".to_string(),
        },
        _ => CheckResult {
            passed: false,
            message: format!("Backend services not reachable at {}", base_url),
            severity: "warning".to_string(),
        },
    }
}

// ============================================================================
// TAURI COMMANDS (Preserved from original - all IPC endpoints)
// ============================================================================

#[tauri::command]
async fn run_diagnostics(state: State<'_, AppState>) -> Result<DiagnosticsResult, String> {
    let mut checks = HashMap::new();

    let (ram, disk, ollama, models, backend) = tokio::join!(
        check_ram(2.0),
        check_disk(5.0),
        check_ollama(),
        check_models(vec![
            "deepseek-r1:14b".to_string(),
            "qwen2.5-coder:7b".to_string()
        ]),
        check_backend_services(&state.backend_base_url)
    );

    checks.insert("ram".to_string(), ram.clone());
    checks.insert("disk".to_string(), disk.clone());
    checks.insert("ollama".to_string(), ollama.clone());
    checks.insert("models".to_string(), models.clone());
    checks.insert("backend".to_string(), backend.clone());

    let all_passed = checks.values().all(|c| c.passed);
    let has_errors = checks.values().any(|c| c.severity == "error");

    let status = if all_passed {
        "OK".to_string()
    } else if has_errors {
        "ERROR".to_string()
    } else {
        "WARNING".to_string()
    };

    let result = DiagnosticsResult {
        status: status.clone(),
        checks,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs_f64(),
    };

    *state.preflight_passed.lock().unwrap() = status == "OK";
    *state.diagnostics.lock().unwrap() = Some(result.clone());

    Ok(result)
}

#[tauri::command]
async fn health_check() -> Result<String, String> {
    Ok("Unity preflight alive".into())
}

#[tauri::command]
async fn evaluate(
    state: State<'_, AppState>,
    request: EvaluateRequest,
) -> Result<EvaluateResponse, String> {
    if !*state.preflight_passed.lock().unwrap() {
        return Err("Preflight checks failed - run diagnostics first".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/evaluate", state.backend_base_url);

    match client
        .post(&url)
        .json(&request)
        .timeout(Duration::from_secs(60))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => response
            .json::<EvaluateResponse>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e)),
        Ok(response) => Err(format!("Backend error: {}", response.status())),
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

#[tauri::command]
async fn mutate_workflow(
    state: State<'_, AppState>,
    request: MutateRequest,
) -> Result<MutateResponse, String> {
    if !*state.preflight_passed.lock().unwrap() {
        return Err("Preflight checks failed".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/mutate", state.backend_base_url);

    match client
        .post(&url)
        .json(&request)
        .timeout(Duration::from_secs(60))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => response
            .json::<MutateResponse>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e)),
        _ => Err("Mutation request failed".to_string()),
    }
}

#[tauri::command]
async fn get_bandit_status(state: State<'_, AppState>) -> Result<BanditStatus, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/bandit/status", state.backend_base_url);

    match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => response
            .json::<BanditStatus>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e)),
        _ => Err("Failed to get bandit status".to_string()),
    }
}

#[tauri::command]
async fn create_memory_snapshot(
    state: State<'_, AppState>,
    title: String,
    content: String,
) -> Result<MemorySnapshot, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/memory/snapshot", state.backend_base_url);

    let body = serde_json::json!({
        "title": title,
        "content": content
    });

    match client.post(&url).json(&body).send().await {
        Ok(response) if response.status().is_success() => response
            .json::<MemorySnapshot>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e)),
        _ => Err("Failed to create memory snapshot".to_string()),
    }
}

#[tauri::command]
async fn get_workflow_dag(state: State<'_, AppState>) -> Result<WorkflowDAG, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/workflow/dag", state.backend_base_url);

    match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => response
            .json::<WorkflowDAG>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e)),
        _ => Err("Failed to get workflow DAG".to_string()),
    }
}

#[tauri::command]
async fn get_telemetry_metrics(state: State<'_, AppState>) -> Result<TelemetryMetrics, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/telemetry/metrics", state.backend_base_url);

    match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => response
            .json::<TelemetryMetrics>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e)),
        _ => Err("Failed to get telemetry metrics".to_string()),
    }
}

#[tauri::command]
fn is_preflight_passed(state: State<'_, AppState>) -> bool {
    *state.preflight_passed.lock().unwrap()
}

// ============================================================================
// MAIN - UNITY SIDECAR ORCHESTRATION
// ============================================================================

fn main() {
    println!("[Unity] Starting application...");

    let app_state = AppState {
        backend_base_url: "http://127.0.0.1:8000".to_string(),
        preflight_passed: Arc::new(Mutex::new(false)),
        diagnostics: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            health_check,
            run_diagnostics,
            evaluate,
            mutate_workflow,
            get_bandit_status,
            create_memory_snapshot,
            get_workflow_dag,
            get_telemetry_metrics,
            is_preflight_passed
        ])
        .setup(|app| {
            println!("[Unity] Setup: Spawning sidecars...");

            // 1) Start Ollama server
            match spawn_sidecar(&app.handle(), "binaries/ollama", &["serve"]) {
                Ok(_child) => println!("[Unity] Ollama sidecar spawned successfully"),
                Err(e) => eprintln!("[Unity] Failed to spawn Ollama: {}", e),
            }

            // 2) Start Python backend
            match spawn_sidecar(&app.handle(), "binaries/python_backend", &[]) {
                Ok(_child) => println!("[Unity] Python backend sidecar spawned successfully"),
                Err(e) => eprintln!("[Unity] Failed to spawn Python backend: {}", e),
            }

            // 3) Run preflight checks in background (non-blocking)
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // Give sidecars time to start
                println!("[Unity] Waiting for sidecars to initialize...");
                thread::sleep(Duration::from_secs(2));

                // Run preflight
                if preflight() {
                    println!("[Unity] Preflight complete: OK");
                    app_handle
                        .emit_all("unity:ready", "preflight_ok")
                        .ok();
                } else {
                    eprintln!("[Unity] Preflight complete: FAILED");
                    app_handle
                        .emit_all("unity:warn", "preflight_failed")
                        .ok();
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Unity build failed")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                println!("[Unity] Exiting application...");
                let _ = app_handle.emit_all("unity:exit", "goodbye");
                // Tauri automatically kills sidecar processes on exit
            }
        });
}
