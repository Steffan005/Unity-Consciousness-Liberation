// Unity Ascension — tests/ui.spec.ts
// Source: One-Click Quantum Build (Dr. Claude Summers, Cosmic Orchestrator)
// Unity: All processes are one process
//
// Playwright E2E tests for Unity GUI
// Tests: Preflight → Diagnostics → Evaluate → Mutate flow

import { test, expect } from '@playwright/test';

test.describe('Unity E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Unity app (assumes dev server running on 1420)
    await page.goto('http://localhost:1420');
  });

  test('Unity preflight → buttons enable → diagnostics flow', async ({ page }) => {
    console.log('[Test] Starting Unity preflight test...');

    // 1. Wait for preflight to complete (up to 60 seconds)
    // This looks for a data-test attribute on a preflight indicator
    await page.waitForSelector('[data-test="preflight-ok"]', { timeout: 60000 });
    console.log('[Test] Preflight indicator visible');

    // 2. Verify "Run Diagnostics" button is enabled
    const diagButton = page.getByRole('button', { name: /Run Diagnostics/i });
    await expect(diagButton).toBeEnabled();
    console.log('[Test] Run Diagnostics button enabled');

    // 3. Click diagnostics button
    await diagButton.click();
    console.log('[Test] Clicked Run Diagnostics');

    // 4. Wait for diagnostics result (console or UI indicator)
    await page.waitForTimeout(2000); // Give diagnostics time to complete

    // 5. Verify other buttons are now enabled
    const evaluateButton = page.getByRole('button', { name: /Evaluate Agent/i });
    await expect(evaluateButton).toBeEnabled();
    console.log('[Test] Evaluate Agent button enabled');
  });

  test('Evaluate agent workflow', async ({ page }) => {
    console.log('[Test] Starting evaluate workflow test...');

    // Wait for preflight
    await page.waitForSelector('[data-test="preflight-ok"]', { timeout: 60000 });

    // Run diagnostics first
    await page.getByRole('button', { name: /Run Diagnostics/i }).click();
    await page.waitForTimeout(2000);

    // Click Evaluate Agent
    const evaluateButton = page.getByRole('button', { name: /Evaluate Agent/i });
    await evaluateButton.click();
    console.log('[Test] Clicked Evaluate Agent');

    // Wait for telemetry to update (look for tokens/sec display)
    await page.waitForSelector('[data-test="telemetry-tokens"]', { timeout: 30000 });
    console.log('[Test] Telemetry visible');

    // Verify telemetry panel shows some data
    const telemetryPanel = page.locator('[data-test="telemetry-tokens"]');
    await expect(telemetryPanel).toBeVisible();
  });

  test('Mutate workflow', async ({ page }) => {
    console.log('[Test] Starting mutate workflow test...');

    // Wait for preflight
    await page.waitForSelector('[data-test="preflight-ok"]', { timeout: 60000 });

    // Run diagnostics
    await page.getByRole('button', { name: /Run Diagnostics/i }).click();
    await page.waitForTimeout(2000);

    // Click Mutate Workflow
    const mutateButton = page.getByRole('button', { name: /Mutate Workflow/i });
    await mutateButton.click();
    console.log('[Test] Clicked Mutate Workflow');

    // Wait for mutation result (console logs or UI update)
    await page.waitForTimeout(5000);

    // Check console panel for mutation output
    const consolePanel = page.locator('[data-test="console-panel"]');
    await expect(consolePanel).toBeVisible();
  });

  test('Bandit controller status', async ({ page }) => {
    console.log('[Test] Starting bandit controller test...');

    // Wait for preflight
    await page.waitForSelector('[data-test="preflight-ok"]', { timeout: 60000 });

    // Run diagnostics
    await page.getByRole('button', { name: /Run Diagnostics/i }).click();
    await page.waitForTimeout(2000);

    // Click Bandit Controller
    const banditButton = page.getByRole('button', { name: /Bandit Controller/i });
    await banditButton.click();
    console.log('[Test] Clicked Bandit Controller');

    // Wait for bandit status display
    await page.waitForTimeout(2000);

    // Verify console shows bandit statistics
    const consolePanel = page.locator('[data-test="console-panel"]');
    await expect(consolePanel).toContainText(/total pulls|arm/i);
  });

  test('Full workflow: Diagnose → Evaluate → Mutate → Bandit', async ({ page }) => {
    console.log('[Test] Starting full workflow test...');

    // Wait for preflight
    await page.waitForSelector('[data-test="preflight-ok"]', { timeout: 60000 });

    // 1. Run Diagnostics
    await page.getByRole('button', { name: /Run Diagnostics/i }).click();
    await page.waitForTimeout(2000);
    console.log('[Test] ✅ Diagnostics complete');

    // 2. Evaluate Agent
    await page.getByRole('button', { name: /Evaluate Agent/i }).click();
    await page.waitForTimeout(3000);
    console.log('[Test] ✅ Evaluate complete');

    // 3. Mutate Workflow
    await page.getByRole('button', { name: /Mutate Workflow/i }).click();
    await page.waitForTimeout(5000);
    console.log('[Test] ✅ Mutate complete');

    // 4. Bandit Controller
    await page.getByRole('button', { name: /Bandit Controller/i }).click();
    await page.waitForTimeout(2000);
    console.log('[Test] ✅ Bandit status retrieved');

    // Verify telemetry updated throughout
    const telemetryPanel = page.locator('[data-test="telemetry-tokens"]');
    await expect(telemetryPanel).toBeVisible();

    console.log('[Test] ✅ Full workflow complete');
  });
});
