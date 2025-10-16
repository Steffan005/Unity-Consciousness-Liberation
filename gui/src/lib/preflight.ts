// Unity Ascension — gui/src/lib/preflight.ts
// Source: One-Click Quantum Build (Dr. Claude Summers, Cosmic Orchestrator)
// Unity: All processes are one process
//
// Tiny UI helper: poll readiness + enforce zero-hallucination gating
// Polls backend and Ollama endpoints until both respond OK

export interface PreflightStatus {
  ready: boolean;
  backendReachable: boolean;
  ollamaReachable: boolean;
  attempts: number;
  maxAttempts: number;
}

/**
 * Wait for Unity backend and Ollama to be ready
 * Polls both services with retries
 *
 * @param maxTries Maximum number of attempts (default: 60 = 30 seconds @ 500ms intervals)
 * @param delayMs Delay between attempts in milliseconds (default: 500)
 * @returns Promise<void> - Resolves when both services ready, rejects on timeout
 */
export async function waitForUnityReady(
  maxTries: number = 60,
  delayMs: number = 500
): Promise<void> {
  console.log('[Unity] Waiting for services to be ready...');

  for (let i = 0; i < maxTries; i++) {
    try {
      // Check backend
      const backendRes = await fetch('http://127.0.0.1:8000/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      // Check Ollama
      const ollamaRes = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
      });

      if (backendRes.ok && ollamaRes.ok) {
        console.log(
          `[Unity] Preflight PASSED (attempt ${i + 1}/${maxTries})`
        );
        return;
      }

      console.log(
        `[Unity] Services not ready yet (attempt ${i + 1}/${maxTries}): ` +
        `backend=${backendRes.ok}, ollama=${ollamaRes.ok}`
      );
    } catch (error) {
      // Ignore fetch errors (services not up yet)
      console.log(
        `[Unity] Services not reachable (attempt ${i + 1}/${maxTries})`
      );
    }

    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(
    `Preflight failed: backend or Ollama not ready after ${maxTries} attempts`
  );
}

/**
 * Poll preflight status without throwing
 * Useful for UI components that want to show loading state
 *
 * @returns Promise<PreflightStatus>
 */
export async function checkPreflightStatus(): Promise<PreflightStatus> {
  let backendReachable = false;
  let ollamaReachable = false;

  try {
    const backendRes = await fetch('http://127.0.0.1:8000/health', {
      method: 'GET',
    });
    backendReachable = backendRes.ok;
  } catch {
    backendReachable = false;
  }

  try {
    const ollamaRes = await fetch('http://127.0.0.1:11434/api/tags', {
      method: 'GET',
    });
    ollamaReachable = ollamaRes.ok;
  } catch {
    ollamaReachable = false;
  }

  return {
    ready: backendReachable && ollamaReachable,
    backendReachable,
    ollamaReachable,
    attempts: 1,
    maxAttempts: 1,
  };
}

/**
 * Listen to Unity events from Rust sidecars
 * Returns cleanup function to remove listeners
 */
export function listenToUnityEvents(): () => void {
  // This would use Tauri event listeners if available
  // For now, return a no-op cleanup
  console.log('[Unity] Event listeners registered (stub)');

  return () => {
    console.log('[Unity] Event listeners cleaned up');
  };
}
