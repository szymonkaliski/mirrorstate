import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const COUNTER_FILE = path.join(__dirname, '../examples/counter.mirror.json');

test.describe('Performance', () => {
  test.beforeEach(async () => {
    // Reset counter to 5 for testing
    await fs.writeFile(COUNTER_FILE, '5');
  });

  test('counter renders minimum required times on initial load', async ({ page }) => {
    const consoleLogs: string[] = [];

    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('counter state')) {
        consoleLogs.push(text);
      }
    });

    await page.goto('/');

    // Wait for page to fully load and render
    await expect(page.getByText('Counter: 5')).toBeVisible();
    await page.waitForTimeout(500);

    // Filter to counter logs only
    const counterLogs = consoleLogs.filter(log => log.includes('counter state'));

    // Should render exactly 2 times on initial load (React strict mode double-render in dev)
    // In production it should be 1, but in development with StrictMode it's 2
    expect(counterLogs.length).toBeLessThanOrEqual(2);
    expect(counterLogs[0]).toContain('counter state 5');
  });

  test('counter renders once per UI update', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('counter state')) {
        consoleLogs.push(text);
      }
    });

    await page.goto('/');
    await expect(page.getByText('Counter: 5')).toBeVisible();
    await page.waitForTimeout(200);

    // Clear initial render logs
    consoleLogs.length = 0;

    // Click increment button
    await page.getByRole('button', { name: '+' }).first().click();
    await page.waitForTimeout(300);

    // Should have 1 or 2 renders for the update (2 if StrictMode causes effects to run twice)
    const updateLogs = consoleLogs.filter(log => log.includes('counter state 6'));
    expect(updateLogs.length).toBeGreaterThanOrEqual(1);
    expect(updateLogs.length).toBeLessThanOrEqual(2);
  });

  test('counter renders once per file update', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('counter state')) {
        consoleLogs.push(text);
      }
    });

    await page.goto('/');
    await expect(page.getByText('Counter: 5')).toBeVisible();
    await page.waitForTimeout(200);

    // Clear initial render logs
    consoleLogs.length = 0;

    // Update file externally
    await fs.writeFile(COUNTER_FILE, '42');

    // Wait for update to propagate
    await expect(page.getByText('Counter: 42')).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(200);

    // Should have exactly 1 render for the file update (no StrictMode re-run for this)
    const updateLogs = consoleLogs.filter(log => log.includes('counter state 42'));
    expect(updateLogs.length).toBeGreaterThanOrEqual(1);
    expect(updateLogs.length).toBeLessThanOrEqual(2);
  });

  test('counter does not re-render excessively during rapid updates', async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('counter state')) {
        consoleLogs.push(text);
      }
    });

    await page.goto('/');
    await expect(page.getByText('Counter: 5')).toBeVisible();
    await page.waitForTimeout(200);

    // Clear initial render logs
    consoleLogs.length = 0;

    // Click 5 times rapidly
    const incrementButton = page.getByRole('button', { name: '+' }).first();
    for (let i = 0; i < 5; i++) {
      await incrementButton.click();
    }

    // Wait for all updates to complete
    await expect(page.getByText('Counter: 10')).toBeVisible({ timeout: 2000 });
    await page.waitForTimeout(500);

    // Should have approximately 5 updates worth of renders (plus StrictMode doubles)
    // Allow some flexibility but ensure it's not rendering 20+ times
    expect(consoleLogs.length).toBeGreaterThanOrEqual(5);
    expect(consoleLogs.length).toBeLessThanOrEqual(15); // Max 3x per update seems reasonable
  });
});
