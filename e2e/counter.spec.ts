import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const COUNTER_FILE = path.join(__dirname, '../examples/counter.mirror.json');

test.describe('Counter Example', () => {
  test.beforeEach(async () => {
    // Reset counter to 0 before each test
    await fs.writeFile(COUNTER_FILE, '0');
  });

  test('UI updates persist to file', async ({ page }) => {
    await page.goto('/');

    // Verify initial state
    await expect(page.getByText('Counter: 0')).toBeVisible();

    // Click increment button
    await page.getByRole('button', { name: '+' }).first().click();

    // Wait a bit for file to be written
    await page.waitForTimeout(200);

    // Verify file was updated
    const fileContent = await fs.readFile(COUNTER_FILE, 'utf-8');
    expect(JSON.parse(fileContent)).toBe(1);

    // Verify UI shows correct value
    await expect(page.getByText('Counter: 1')).toBeVisible();

    // Click decrement button
    await page.getByRole('button', { name: '-' }).first().click();
    await page.waitForTimeout(200);

    // Verify file and UI updated
    const newFileContent = await fs.readFile(COUNTER_FILE, 'utf-8');
    expect(JSON.parse(newFileContent)).toBe(0);
    await expect(page.getByText('Counter: 0')).toBeVisible();
  });

  test('file changes update UI', async ({ page }) => {
    await page.goto('/');

    // Verify initial state
    await expect(page.getByText('Counter: 0')).toBeVisible();

    // Update file directly (simulating external edit)
    await fs.writeFile(COUNTER_FILE, '42');

    // UI should auto-update via WebSocket
    await expect(page.getByText('Counter: 42')).toBeVisible({ timeout: 2000 });

    // Wait a bit before next change to allow system to settle
    await page.waitForTimeout(300);

    // Change to negative number
    await fs.writeFile(COUNTER_FILE, '-5');
    await expect(page.getByText('Counter: -5')).toBeVisible({ timeout: 2000 });

    // Wait again
    await page.waitForTimeout(300);

    // Change back to zero
    await fs.writeFile(COUNTER_FILE, '0');
    await expect(page.getByText('Counter: 0')).toBeVisible({ timeout: 2000 });
  });

  test('rapid updates dont lose data', async ({ page }) => {
    await page.goto('/');

    // Verify initial state
    await expect(page.getByText('Counter: 0')).toBeVisible();

    const incrementButton = page.getByRole('button', { name: '+' }).first();

    // Click rapidly 10 times
    for (let i = 0; i < 10; i++) {
      await incrementButton.click();
    }

    // Wait for all updates to propagate
    await page.waitForTimeout(500);

    // Verify final state in file
    const fileContent = await fs.readFile(COUNTER_FILE, 'utf-8');
    expect(JSON.parse(fileContent)).toBe(10);

    // Verify UI shows correct value
    await expect(page.getByText('Counter: 10')).toBeVisible();
  });
});
