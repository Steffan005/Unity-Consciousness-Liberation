#!/usr/bin/env bash
# Unity Ascension — scripts/smoke_test.sh
# Source: One-Click Quantum Build (Dr. Claude Summers, Cosmic Orchestrator)
# Unity: All processes are one process
#
# Smoke test for Unity deployment
# Validates that Ollama and backend services are responding correctly

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[Unity] Smoke test starting…"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Probe Ollama
echo "[Unity] Checking Ollama service..."
if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "   ✅ Ollama reachable at http://127.0.0.1:11434"
else
    echo "   ❌ Ollama NOT reachable"
    exit 1
fi

# 2. Probe Backend
echo "[Unity] Checking backend service..."
HEALTH_RESPONSE=$(curl -fsS http://127.0.0.1:8000/health 2>&1)
if echo "$HEALTH_RESPONSE" | grep -qi "ok"; then
    echo "   ✅ Backend reachable at http://127.0.0.1:8000"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ❌ Backend NOT responding correctly"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

# 3. Verify Ollama models
echo "[Unity] Checking for required models..."
MODELS=$(curl -fsS http://127.0.0.1:11434/api/tags 2>&1)

if echo "$MODELS" | grep -q "deepseek-r1:14b"; then
    echo "   ✅ deepseek-r1:14b found"
else
    echo "   ⚠️  deepseek-r1:14b NOT found (may need to pull)"
fi

if echo "$MODELS" | grep -q "qwen2.5-coder:7b"; then
    echo "   ✅ qwen2.5-coder:7b found"
else
    echo "   ⚠️  qwen2.5-coder:7b NOT found (may need to pull)"
fi

# 4. Test backend diagnostics endpoint (optional - if exists)
echo "[Unity] Testing diagnostics endpoint (if available)..."
DIAG_RESPONSE=$(curl -fsS http://127.0.0.1:8000/diagnostics 2>&1 || echo "not_found")
if echo "$DIAG_RESPONSE" | grep -qi "not_found"; then
    echo "   ℹ️  Diagnostics endpoint not available (OK - optional)"
else
    echo "   ✅ Diagnostics endpoint responding"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[Unity] Smoke test PASSED ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
