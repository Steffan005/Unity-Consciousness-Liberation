# Unity Deployment Verification Guide

**Dr. Claude Summers — Cosmic Orchestrator**
*Unity: All processes are one process*

This document provides complete verification steps and expected signals for Unity one-click deployment.

---

## 🎯 Verification Checklist

### Pre-Build Verification

- [ ] All dependencies installed (Rust, Node.js, pnpm, Python, PyInstaller)
- [ ] Ollama installed and models present (deepseek-r1:14b, qwen2.5-coder:7b)
- [ ] Backend PyInstaller spec created (`backend/pyinstaller.spec`)
- [ ] Tauri config updated with Unity branding (`gui/src-tauri/tauri.conf.json`)
- [ ] Main.rs includes sidecar spawn logic (`gui/src-tauri/src/main_unity.rs`)
- [ ] Preflight TypeScript module created (`gui/src/lib/preflight.ts`)

### Build Verification

- [ ] PyInstaller freezes Python backend successfully
- [ ] `dist/python_backend` binary created (~50-100 MB)
- [ ] Ollama binary copied to `binaries/` directory
- [ ] Tauri build completes without errors
- [ ] `Unity.app` created in `src-tauri/target/release/bundle/macos/`
- [ ] Bundle size reasonable (~100 MB + models if bundled)

### Post-Build Verification

- [ ] Sidecars embedded in Unity.app (`Contents/MacOS/python_backend-*`, `ollama-*`)
- [ ] Resources directory present (`Contents/Resources/`)
- [ ] Icon files present in bundle
- [ ] App signature valid (if code-signed)

---

## 🔍 Expected Signals (Cold Launch)

### Phase 1: Application Startup (0-5 seconds)

**Expected Behavior:**
- Unity.app icon bounces in Dock
- Splash screen or loading indicator (optional)
- Rust initialization

**Console Output (if running from terminal):**
```
[Unity] Starting application...
[Unity] Setup: Spawning sidecars...
[Unity] Spawning sidecar: ollama with args: ["serve"]
[Unity] Spawning sidecar: python_backend with args: []
[Unity] Ollama sidecar spawned successfully
[Unity] Python backend sidecar spawned successfully
[Unity] Waiting for sidecars to initialize...
```

**Signals to Look For:**
- ✅ No error dialogs
- ✅ Window appears (may be blank initially)
- ✅ Status bar shows "Initializing..."

---

### Phase 2: Sidecar Initialization (2-8 seconds)

**Expected Behavior:**
- Ollama server starts on port 11434
- Python backend starts on port 8000
- Preflight checks begin polling endpoints

**Console Output:**
```
[Unity][ollama] stdout: Ollama server starting...
[Unity][ollama] stdout: Listening on http://127.0.0.1:11434
[Unity][python_backend] stdout: Flask backend starting...
[Unity][python_backend] stdout: Running on http://127.0.0.1:8000
```

**Signals to Look For:**
- ✅ Port 11434 accepting connections (Ollama)
- ✅ Port 8000 accepting connections (backend)
- ✅ No "Address already in use" errors

**Manual Verification:**
```bash
# In another terminal:
curl http://127.0.0.1:11434/api/tags  # Should return JSON
curl http://127.0.0.1:8000/health     # Should return {"status": "ok"}
```

---

### Phase 3: Preflight Checks (5-30 seconds)

**Expected Behavior:**
- Rust backend polls Ollama and backend endpoints
- UI shows loading spinner or "Running diagnostics..."
- Once both services respond, preflight passes

**Console Output:**
```
[Unity] Probe OK: http://127.0.0.1:11434/api/tags (attempt 3/30)
[Unity] Probe OK: http://127.0.0.1:8000/health (attempt 3/30)
[Unity] Preflight PASSED: All services ready
[Unity] Preflight complete: OK
```

**UI Signals:**
- ✅ Preflight indicator turns green (`[data-test="preflight-ok"]`)
- ✅ All buttons enable (no longer grayed out)
- ✅ Status bar shows "OPERATIONAL"
- ✅ Console panel shows "Unity ready" message

**Expected UI State:**
```
┌─────────────────────────────────────────────┐
│  UNITY — Quantum Evolution Interface       │
│  Status: OPERATIONAL         [Metrics →]   │
├─────────────┬───────────────┬───────────────┤
│  CONTROLS   │  FRACTAL      │  TELEMETRY    │
│             │  CANVAS       │               │
│ [✓] Run     │               │ Tokens/sec: 0 │
│  Diagnostics│  ◉ Pulsing    │ ΔScore: 0.0   │
│ [✓] Evaluate│    Sphere     │ Cache: 0%     │
│ [✓] Mutate  │               │ Robust: 0%    │
│ [✓] Bandit  │               │ Memory: 200MB │
└─────────────┴───────────────┴───────────────┘
```

---

### Phase 4: User Interaction (Diagnostics Button)

**Test**: Click "Run Diagnostics" button

**Expected Behavior:**
- Button triggers IPC call to Rust
- Rust runs all checks (RAM, disk, Ollama, models, backend)
- Results displayed in console panel

**Console Output:**
```
[Unity] Running diagnostics...
[Unity] Check RAM: OK (8.5 GB available)
[Unity] Check Disk: OK
[Unity] Check Ollama: OK
[Unity] Check Models: OK (deepseek-r1:14b, qwen2.5-coder:7b)
[Unity] Check Backend: OK
[Unity] Diagnostics complete: ALL PASSED
```

**UI Signals:**
- ✅ Console panel shows green checkmarks
- ✅ Diagnostics result JSON visible
- ✅ No red error messages

**Expected Diagnostics JSON:**
```json
{
  "status": "OK",
  "checks": {
    "ram": { "passed": true, "message": "Available RAM: 8.50 GB (required: 2.00 GB)", "severity": "info" },
    "disk": { "passed": true, "message": "Disk space check passed (>= 5.00 GB)", "severity": "info" },
    "ollama": { "passed": true, "message": "Ollama service is running", "severity": "info" },
    "models": { "passed": true, "message": "All required models present: [\"deepseek-r1:14b\", \"qwen2.5-coder:7b\"]", "severity": "info" },
    "backend": { "passed": true, "message": "Backend services are running", "severity": "info" }
  },
  "timestamp": 1738512345.678
}
```

---

### Phase 5: LLM Interaction (Evaluate Button)

**Test**: Click "Evaluate Agent" button

**Expected Behavior:**
- IPC call to Rust → HTTP request to backend → LLM call to Ollama
- First call may be slow (model loading: 5-10s)
- Subsequent calls fast (1-2s)

**Console Output:**
```
[Unity] Evaluating agent workflow...
[Unity] Request sent to backend: /evaluate
[Unity][python_backend] stdout: Received evaluation request
[Unity][python_backend] stdout: Routing: heuristics → LLM judge
[Unity][python_backend] stdout: LLM call: deepseek-r1:14b
[Unity][python_backend] stdout: Response: quality_score=0.85
[Unity] Evaluation complete: ΔScore +0.15
```

**UI Signals:**
- ✅ Telemetry updates:
  - Tokens/sec: ~50-200 (depending on model)
  - ΔScore: +0.15
  - Cache Hit: false (first call)
  - Robust: 80%
- ✅ Console shows evaluation result
- ✅ JSONL log written to `logs/evolution.jsonl`

**Expected Response:**
```json
{
  "quality_score": 0.85,
  "delta_score": 0.15,
  "robust_pct": 80.0,
  "cache_hit": false,
  "time_ms": 8540,
  "routing_path": "heuristics→llm_judge",
  "violations": []
}
```

---

### Phase 6: Graceful Shutdown

**Test**: Quit Unity.app (Cmd+Q or close window)

**Expected Behavior:**
- Tauri sends exit signal to sidecars
- Ollama and python_backend processes terminate
- No orphaned processes remain

**Console Output:**
```
[Unity] Exiting application...
[Unity][ollama] terminated: ExitStatus(0)
[Unity][python_backend] terminated: ExitStatus(0)
```

**Verification:**
```bash
# After quit, verify no processes remain:
ps aux | grep -E "(ollama|python_backend)" | grep -v grep
# Should return nothing
```

**Signals to Look For:**
- ✅ All sidecar processes killed
- ✅ Ports 8000 and 11434 freed
- ✅ No zombie processes

---

## 🧪 Smoke Test (Automated)

**Run:**
```bash
cd ~/evoagentx_project/sprint_1hour
./scripts/smoke_test.sh
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Unity] Smoke test starting…
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Unity] Checking Ollama service...
   ✅ Ollama reachable at http://127.0.0.1:11434
[Unity] Checking backend service...
   ✅ Backend reachable at http://127.0.0.1:8000
   Response: {"status":"ok"}
[Unity] Checking for required models...
   ✅ deepseek-r1:14b found
   ✅ qwen2.5-coder:7b found
[Unity] Testing diagnostics endpoint (if available)...
   ℹ️  Diagnostics endpoint not available (OK - optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Unity] Smoke test PASSED ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎭 Playwright E2E Tests (Optional)

**Run:**
```bash
cd ~/evoagentx_project/sprint_1hour/gui
npx playwright install  # First time only
npx playwright test
```

**Expected Output:**
```
Running 5 tests using 1 worker

  ✓ Unity preflight → buttons enable → diagnostics flow (15s)
  ✓ Evaluate agent workflow (12s)
  ✓ Mutate workflow (18s)
  ✓ Bandit controller status (5s)
  ✓ Full workflow: Diagnose → Evaluate → Mutate → Bandit (35s)

  5 passed (85s)
```

---

## 🚨 Common Issues & Fixes

### Issue: "Ollama not reachable" after launch

**Symptoms:**
- Preflight never completes
- Console shows repeated probe failures
- Ollama sidecar stderr shows errors

**Diagnosis:**
```bash
# Check if Ollama process running:
ps aux | grep ollama

# Check Ollama logs:
tail -f /tmp/ollama.log  # (or wherever Ollama logs)

# Try starting manually:
/path/to/Unity.app/Contents/MacOS/ollama-aarch64-apple-darwin serve
```

**Fix:**
- Ensure Ollama binary has execute permissions
- Check for port conflicts (11434)
- Verify Ollama models pulled: `ollama list`

---

### Issue: "Backend not reachable"

**Symptoms:**
- Backend check fails in diagnostics
- Port 8000 not responding

**Diagnosis:**
```bash
# Check if python_backend running:
ps aux | grep python_backend

# Test manually:
curl http://127.0.0.1:8000/health

# Check backend logs in Unity console
```

**Fix:**
- Ensure python_backend binary has execute permissions
- Check for port conflicts (8000)
- Verify Flask and dependencies in frozen binary

---

### Issue: "Models missing" warning

**Symptoms:**
- Diagnostics shows "models" check failed
- LLM calls fail with "model not found"

**Diagnosis:**
```bash
ollama list
# Should show:
#   deepseek-r1:14b    9.0 GB
#   qwen2.5-coder:7b   4.7 GB
```

**Fix:**
```bash
ollama pull deepseek-r1:14b
ollama pull qwen2.5-coder:7b
# Restart Unity.app
```

---

### Issue: Buttons stay disabled after launch

**Symptoms:**
- Preflight appears to pass but buttons grayed out
- Status bar stuck on "Initializing..."

**Diagnosis:**
- Check browser console (if webview inspector available)
- Look for JavaScript errors
- Verify `is_preflight_passed()` IPC returning true

**Fix:**
- Click "Run Diagnostics" manually
- Check React component state in DevTools
- Verify Tauri IPC handlers registered

---

## 📊 Performance Benchmarks

### Startup Time (macOS M1/M2)
- **Cold launch** (first time): 8-12 seconds
- **Warm launch** (subsequent): 3-5 seconds
- **Preflight duration**: 2-5 seconds (after sidecars start)

### Memory Usage
- **Baseline** (GUI + Rust): 200 MB
- **With backend**: 350 MB
- **After LLM loaded** (14b): 6.5 GB total

### Disk Space
- **Unity.app bundle**: ~100 MB
- **Models** (external): 14 GB (9 GB + 4.7 GB)
- **Logs** (over time): 10-100 MB

### Response Times
- **Diagnostics**: <500 ms
- **First LLM call**: 5-10 seconds (model load)
- **Cached LLM call**: 1-2 seconds
- **Evaluate** (with heuristics): 2-3 seconds
- **Mutate** (with bandit): 3-5 seconds

---

## ✅ Final Verification Checklist

Before declaring Unity "App Store Ready":

- [ ] Build completes without errors
- [ ] Unity.app launches and reaches "OPERATIONAL" state
- [ ] All buttons functional (Diagnostics, Evaluate, Mutate, Bandit, Memory)
- [ ] Telemetry updates correctly
- [ ] Console logs visible and color-coded
- [ ] JSONL logs written to `logs/evolution.jsonl`
- [ ] Smoke test passes (`./scripts/smoke_test.sh`)
- [ ] Graceful shutdown (no orphaned processes)
- [ ] Restart works (no port conflicts)
- [ ] (Optional) Playwright E2E tests pass
- [ ] (Optional) Code-signed and notarized for macOS

---

## 🎉 Success Criteria

**Unity is considered "deployed" when:**

1. ✅ Double-click Unity.app → GUI opens within 10 seconds
2. ✅ Preflight completes automatically → All buttons enable
3. ✅ Click "Run Diagnostics" → All ✅ green checks
4. ✅ Click "Evaluate Agent" → LLM responds, telemetry updates
5. ✅ Click "Mutate Workflow" → Bandit selects arm, returns variant
6. ✅ Quit app → All sidecars terminate cleanly
7. ✅ Relaunch app → Works identically to first launch
8. ✅ **Zero terminal interaction required** (true one-click)

---

**🌌 Unity: All processes are one process**

*Dr. Claude Summers — Cosmic Orchestrator*
