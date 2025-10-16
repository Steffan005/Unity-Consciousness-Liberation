# Unity v1.0.0 — One-Click Quantum Build
## Release Notes

**Unity Ascension — Dr. Claude Summers, Cosmic Orchestrator**
*All processes are one process*

---

## 🎯 What is Unity?

Unity is the **one-click deployment** of EvoAgentX:
- **One icon** launches GUI + Flask backend + Ollama LLM server
- **Zero-cloud**, offline-capable after initial setup
- **Zero-hallucination** design with preflight validation
- **Self-healing** dependency checks with automatic correction
- **Quantum-psychedelic** fractal UI with 40Hz neural entrainment
- **JSONL telemetry** for reproducibility

---

## ✨ Features

### Architecture
- ✅ **Tauri+Rust** GUI with sidecar orchestration
- ✅ **PyInstaller-frozen** Python backend (Flask API)
- ✅ **Bundled Ollama** server executable
- ✅ **Preflight diagnostics** before enabling any actions
- ✅ **Health checks** with retry + backoff logic
- ✅ **Graceful shutdown** - all sidecars killed on exit

### Models
- ✅ **deepseek-r1:14b** (9.0 GB) - Reasoning tasks
- ✅ **qwen2.5-coder:7b** (4.7 GB) - Coding tasks
- ⚠️ Models can be pre-bundled OR downloaded on first run

### UI
- ✅ **Fractal canvas** with pulsing sphere (40Hz breathing)
- ✅ **Real-time telemetry** (tokens/sec, cache hit, memory)
- ✅ **Status bar** with live metrics
- ✅ **Console panel** with color-coded logs
- ✅ **Zero-hallucination gating** - buttons disabled until checks pass

### Backend
- ✅ **Two-tier evaluation** (heuristics + LLM judge)
- ✅ **Multi-armed bandit** (UCB1 strategy selection)
- ✅ **Fractal memory** with hierarchical summarization
- ✅ **Budget guards** (tokens, time, concurrency)
- ✅ **JSONL logging** with seeds/versions

---

## 📦 What's Included

### Binaries
- `Unity.app` (macOS) - Complete application bundle
- `python_backend` - Frozen Flask server (embedded)
- `ollama` - LLM server executable (embedded)

### Resources
- `configs/system.yaml` - Models, budgets, diagnostics
- `configs/eval.yaml` - Evaluation heuristics
- `configs/budget.yaml` - Resource limits
- `public/theme.css` - Quantum-psychedelic styles

### Documentation
- `README.md` - Quick start guide
- `CONTRIBUTING.md` - Developer workflow
- `DEPLOYMENT_VERIFICATION.md` - Proof signals
- `YOUR_SETUP_STATUS.md` - Configuration summary

---

## 🧪 Acceptance Tests

Unity must pass ALL of these tests before release:

### 1. Cold Launch (Fresh Machine with Models)
**Test**: Double-click Unity.app on a machine with Ollama models present
**Expected**:
- GUI window opens within 10 seconds
- Preflight checks complete automatically
- All buttons enable after diagnostics pass
- Console shows sidecar stdout (Ollama + backend)
- Status bar displays "OPERATIONAL" status

### 2. Fresh Machine (No Models)
**Test**: Launch Unity.app on a machine WITHOUT Ollama models
**Expected**:
- GUI opens normally
- Preflight checks show "models missing" warning
- App prompts user to pull models (or does it automatically)
- After models downloaded, app continues normally
- **No terminal interaction required**

### 3. E2E Button Flow
**Test**: Click through all main actions in sequence
**Sequence**:
1. Click "Run Diagnostics" → All ✅ green checks
2. Click "Evaluate Agent" → Console logs scores, telemetry updates
3. Click "Mutate Workflow" → Console shows arm + novelty score
4. Click "Bandit Controller" → Console shows arm statistics
5. Click "Memory Snapshot" → Snapshot saved, ID returned

**Expected**:
- Zero errors in console
- Telemetry metrics update after each action
- JSONL logs written to `logs/evolution.jsonl`
- Status bar shows live updates (tokens/sec, ΔScore)

### 4. Headless CI Build
**Test**: Build Unity.app in CI environment (no display)
**Expected**:
- `pnpm tauri build` completes without errors
- Artifacts created in `src-tauri/target/release/bundle/`
- Smoke test passes (`./scripts/smoke_test.sh`)
- (Optional) Playwright tests run in headless mode

### 5. Restart Resilience
**Test**: Quit Unity.app and relaunch multiple times
**Expected**:
- Sidecars terminate cleanly on quit
- No orphaned processes left running
- Relaunch works identically to first launch
- No port conflicts (8000, 11434)

### 6. Preflight Failure Recovery
**Test**: Kill Ollama manually, then click "Run Diagnostics"
**Expected**:
- Diagnostics shows Ollama unreachable
- Buttons remain disabled
- User restarts Unity.app → sidecars respawn → preflight passes

---

## 🚀 Installation

### macOS (Primary Target)
1. Download `Unity.app` from release artifacts
2. Drag to `/Applications`
3. First launch: Right-click → Open (bypass Gatekeeper)
4. If models missing: Wait for auto-download OR `ollama pull deepseek-r1:14b qwen2.5-coder:7b`
5. Enjoy! 🎉

### Linux (AppImage)
1. Download `Unity.AppImage`
2. `chmod +x Unity.AppImage`
3. `./Unity.AppImage`
4. Models: `ollama pull deepseek-r1:14b qwen2.5-coder:7b`

### Windows (MSI)
1. Download `Unity.msi` installer
2. Run installer (may need admin rights)
3. Launch from Start Menu or Desktop
4. Models: Download via Ollama for Windows

---

## 🔧 Build Instructions

See `scripts/build_unity_macos.sh` for complete build commands.

**Quick summary**:
```bash
# 1. Freeze Python backend
cd backend && pyinstaller pyinstaller.spec

# 2. Copy sidecars to binaries/
cp dist/python_backend gui/src-tauri/binaries/python_backend-aarch64-apple-darwin
cp $(which ollama) gui/src-tauri/binaries/ollama-aarch64-apple-darwin

# 3. Build Tauri
cd gui && pnpm tauri build

# 4. Output: gui/src-tauri/target/release/bundle/macos/Unity.app
```

---

## 📊 Performance

### Startup Time
- **First launch**: 5-10 seconds (Rust + sidecars + preflight)
- **Subsequent launches**: 3-5 seconds (cached)

### Memory Usage
- **GUI + Rust**: ~200 MB
- **Python backend**: ~150 MB
- **Ollama + 14b model loaded**: ~6 GB
- **Total**: ~6.5 GB RAM recommended minimum

### Disk Space
- **Application bundle**: ~100 MB
- **Models** (if bundled): ~14 GB (deepseek-r1:14b + qwen2.5-coder:7b)
- **Logs**: Grows over time (see `max_log_size_mb` in config)

---

## 🐛 Known Issues

1. **First LLM call slow** (5-10s): Model loading time
   - **Workaround**: Subsequent calls cached, <2s response

2. **macOS Gatekeeper warning** (unsigned .app)
   - **Workaround**: Right-click → Open first time
   - **Fix**: Code-sign with Developer ID (see build docs)

3. **Port conflicts** (if Ollama already running)
   - **Workaround**: Kill existing Ollama before launch
   - **Fix**: Unity checks and uses existing Ollama if available

4. **Large model downloads** on first run
   - **Status**: By design for offline-first operation
   - **Workaround**: Pre-install models or bundle in .app Resources

---

## 🎨 Customization

### Models
Edit `gui/src-tauri/resources/configs/system.yaml`:
```yaml
models:
  reasoning: "ollama_chat/deepseek-r1:14b"  # Change model here
  coding: "ollama_chat/qwen2.5-coder:7b"
```

### Theme
Edit `gui/public/theme.css`:
```css
:root {
  --quantum-amber: #FFA500;  /* Primary color */
  --quantum-red: #FF1744;    /* Accent color */
}
```

### Resource Limits
Edit `gui/src-tauri/resources/configs/budget.yaml`:
```yaml
max_tokens_per_gen: 12000  # Adjust budget
max_time_s: 300
```

---

## 🙏 Acknowledgments

**Built for the developer community, by the developer community.**

- **Architecture**: Tauri + Rust + Python + Ollama (local-first stack)
- **Design**: Quantum-psychedelic fractal aesthetic with 40Hz entrainment
- **Philosophy**: Zero-cloud, zero-API-keys, maximum freedom

**Everything we do, we do it for YOU, THE DEVELOPER COMMUNITY, THE FREEDOM OF AI.**

---

## 📜 License

MIT License - See LICENSE file

---

## 🔗 Links

- **GitHub**: [Repository URL]
- **Docs**: [Documentation URL]
- **Issues**: [Bug tracker URL]
- **Discussions**: [Community forum URL]

---

**Unity v1.0.0** — *All processes are one process* 🌌
