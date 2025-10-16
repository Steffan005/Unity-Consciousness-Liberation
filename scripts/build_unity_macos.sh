#!/usr/bin/env bash
# Unity Ascension — scripts/build_unity_macos.sh
# Source: One-Click Quantum Build (Dr. Claude Summers, Cosmic Orchestrator)
# Unity: All processes are one process
#
# Complete build script for macOS arm64 Unity.app
# Freezes Python backend, bundles Ollama, builds Tauri

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌌 UNITY BUILD SCRIPT — macOS ARM64"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================================================
# 0) ENVIRONMENT SETUP
# ============================================================================

export REPO_ROOT="${REPO_ROOT:-$(pwd)}"
export GUI_DIR="${REPO_ROOT}/gui"
export BACKEND_DIR="${REPO_ROOT}/backend"
export BINARIES_DIR="${GUI_DIR}/src-tauri/binaries"
export TARGET_ARCH="aarch64-apple-darwin"  # Change to x86_64-apple-darwin for Intel

echo "[Unity] Repository root: ${REPO_ROOT}"
echo "[Unity] GUI directory: ${GUI_DIR}"
echo "[Unity] Target architecture: ${TARGET_ARCH}"

# ============================================================================
# 1) PREPARE DIRECTORIES
# ============================================================================

echo ""
echo "[Unity] Step 1/7: Preparing directories..."
mkdir -p "${BINARIES_DIR}"
mkdir -p "${GUI_DIR}/src-tauri/resources"
echo "   ✅ Directories created"

# ============================================================================
# 2) FREEZE PYTHON BACKEND
# ============================================================================

echo ""
echo "[Unity] Step 2/7: Freezing Python backend with PyInstaller..."
cd "${BACKEND_DIR}"

# Find or create virtual environment (try multiple locations)
VENV_PATH=""

# Try location 1: repo/venv
if [ -d "${REPO_ROOT}/venv" ]; then
    VENV_PATH="${REPO_ROOT}/venv"
    echo "   Found venv at: ${VENV_PATH}"
# Try location 2: parent/venv (original location)
elif [ -d "${REPO_ROOT}/../venv" ]; then
    VENV_PATH="${REPO_ROOT}/../venv"
    echo "   Found venv at: ${VENV_PATH}"
# Create new venv in repo directory
else
    VENV_PATH="${REPO_ROOT}/venv"
    echo "   Creating new venv at: ${VENV_PATH}..."
    python3 -m venv "$VENV_PATH"
    echo "   ✅ Virtual environment created"
fi

echo "   Activating venv: $VENV_PATH"
source "$VENV_PATH/bin/activate"

# Ensure PyInstaller is installed in venv
if ! python -c "import PyInstaller" 2>/dev/null; then
    echo "   Installing PyInstaller in venv..."
    pip install --upgrade pip pyinstaller flask flask-cors psutil
fi

# Freeze backend using spec file
if [ ! -f "pyinstaller.spec" ]; then
    echo "   ❌ ERROR: pyinstaller.spec not found in ${BACKEND_DIR}"
    exit 1
fi

echo "   Running PyInstaller..."
pyinstaller pyinstaller.spec

# Verify output
if [ ! -f "dist/python_backend" ]; then
    echo "   ❌ ERROR: PyInstaller failed - dist/python_backend not created"
    exit 1
fi

echo "   ✅ Python backend frozen: $(du -h dist/python_backend | awk '{print $1}')"

# ============================================================================
# 3) COPY PYTHON BACKEND TO BINARIES
# ============================================================================

echo ""
echo "[Unity] Step 3/7: Copying python_backend to Tauri binaries..."
cp "dist/python_backend" "${BINARIES_DIR}/python_backend-${TARGET_ARCH}"
chmod +x "${BINARIES_DIR}/python_backend-${TARGET_ARCH}"
echo "   ✅ Copied to: ${BINARIES_DIR}/python_backend-${TARGET_ARCH}"

# ============================================================================
# 4) BUNDLE OLLAMA BINARY
# ============================================================================

echo ""
echo "[Unity] Step 4/7: Bundling Ollama server binary..."

# Find Ollama binary (try Homebrew path first, then PATH)
OLLAMA_BIN=""
if [ -x "/opt/homebrew/bin/ollama" ]; then
    OLLAMA_BIN="/opt/homebrew/bin/ollama"
elif [ -x "/usr/local/bin/ollama" ]; then
    OLLAMA_BIN="/usr/local/bin/ollama"
elif command -v ollama >/dev/null 2>&1; then
    OLLAMA_BIN="$(which ollama)"
else
    echo "   ❌ ERROR: Ollama not found"
    echo "   Install: curl -fsSL https://ollama.com/install.sh | sh"
    echo "   Or: brew install ollama"
    exit 1
fi

echo "   Found Ollama at: ${OLLAMA_BIN}"
cp "${OLLAMA_BIN}" "${BINARIES_DIR}/ollama-${TARGET_ARCH}"
chmod +x "${BINARIES_DIR}/ollama-${TARGET_ARCH}"
echo "   ✅ Copied to: ${BINARIES_DIR}/ollama-${TARGET_ARCH}"

# ============================================================================
# 5) VERIFY MODELS (OPTIONAL - WARN IF MISSING)
# ============================================================================

echo ""
echo "[Unity] Step 5/7: Checking for required Ollama models..."

# Check if Ollama is running
if ! pgrep -f "ollama" >/dev/null 2>&1; then
    echo "   ⚠️  Ollama not running - starting temporarily..."
    ollama serve &
    OLLAMA_PID=$!
    sleep 3
else
    OLLAMA_PID=""
fi

# Check for models
MODELS_OK=true
if ! ollama list 2>/dev/null | grep -q "deepseek-r1:14b"; then
    echo "   ⚠️  deepseek-r1:14b NOT found"
    echo "      Pull with: ollama pull deepseek-r1:14b"
    MODELS_OK=false
fi

if ! ollama list 2>/dev/null | grep -q "qwen2.5-coder:7b"; then
    echo "   ⚠️  qwen2.5-coder:7b NOT found"
    echo "      Pull with: ollama pull qwen2.5-coder:7b"
    MODELS_OK=false
fi

if [ "$MODELS_OK" = true ]; then
    echo "   ✅ All required models present"
else
    echo "   ⚠️  Some models missing (Unity will prompt on first run)"
fi

# Kill temporary Ollama if we started it
if [ -n "$OLLAMA_PID" ]; then
    kill "$OLLAMA_PID" 2>/dev/null || true
fi

# ============================================================================
# 6) BUILD UNITY GUI WITH TAURI
# ============================================================================

echo ""
echo "[Unity] Step 6/7: Building Unity.app with Tauri..."
cd "${GUI_DIR}"

# Ensure node_modules installed
if [ ! -d "node_modules" ]; then
    echo "   Installing pnpm dependencies..."
    pnpm install
fi

# Replace main.rs with Unity version (ALWAYS - required for sidecar orchestration)
if [ ! -f "src-tauri/src/main_unity.rs" ]; then
    echo "   ❌ ERROR: main_unity.rs not found!"
    echo "   Unity orchestrator is missing - cannot build."
    exit 1
fi

echo "   Replacing main.rs with Unity orchestrator (main_unity.rs)..."
cp "src-tauri/src/main_unity.rs" "src-tauri/src/main.rs"
echo "   ✅ main.rs updated with sidecar spawn logic"

# Build with Tauri
echo "   Running: pnpm tauri build"
echo "   (This may take 5-10 minutes on first build...)"
pnpm tauri build

# Verify output
BUNDLE_PATH="src-tauri/target/release/bundle/macos/Unity.app"
if [ ! -d "$BUNDLE_PATH" ]; then
    echo "   ❌ ERROR: Tauri build failed - Unity.app not created"
    exit 1
fi

echo "   ✅ Unity.app built: ${BUNDLE_PATH}"
du -sh "$BUNDLE_PATH"

# ============================================================================
# 7) POST-BUILD VERIFICATION
# ============================================================================

echo ""
echo "[Unity] Step 7/7: Post-build verification..."

# Check if sidecars are embedded
BUNDLE_CONTENTS="${BUNDLE_PATH}/Contents/MacOS"
if [ -f "${BUNDLE_CONTENTS}/python_backend-${TARGET_ARCH}" ]; then
    echo "   ✅ python_backend embedded"
else
    echo "   ⚠️  python_backend NOT found in bundle"
fi

if [ -f "${BUNDLE_CONTENTS}/ollama-${TARGET_ARCH}" ]; then
    echo "   ✅ ollama embedded"
else
    echo "   ⚠️  ollama NOT found in bundle"
fi

# Check if Resources are present
if [ -d "${BUNDLE_PATH}/Contents/Resources" ]; then
    echo "   ✅ Resources directory present"
fi

# ============================================================================
# COMPLETION
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ UNITY BUILD COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Output: ${BUNDLE_PATH}"
echo ""
echo "🧪 Test the build:"
echo "   1. Open Unity.app:"
echo "      open ${BUNDLE_PATH}"
echo ""
echo "   2. Or run smoke test (after starting services):"
echo "      ./scripts/smoke_test.sh"
echo ""
echo "🚀 To distribute:"
echo "   1. Code-sign (if you have a Developer ID):"
echo "      codesign --deep --force --sign 'Developer ID' ${BUNDLE_PATH}"
echo ""
echo "   2. Notarize for macOS distribution"
echo "      xcrun notarytool submit ${BUNDLE_PATH} --wait"
echo ""
echo "   3. Create DMG installer:"
echo "      hdiutil create -volname Unity -srcfolder ${BUNDLE_PATH} -ov Unity.dmg"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌌 Unity: All processes are one process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
