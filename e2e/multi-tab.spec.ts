import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const COUNTER_FILE = path.join(__dirname, '../examples/counter.mirror.json');

test.describe('Multi-tab Synchronization', () => {
  test.beforeEach(async () => {
    // Reset counter to 0 before each test
    await fs.writeFile(COUNTER_FILE, '0');
  });

  test('multiple tabs stay synchronized via WebSocket', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Load both pages
    await page1.goto('/');
    await page2.goto('/');

    // Both should show same initial state
    await expect(page1.getByText('Counter: 0')).toBeVisible();
    await expect(page2.getByText('Counter: 0')).toBeVisible();

    // Click increment in page1
    await page1.getByRole('button', { name: '+' }).first().click();
    await page1.waitForTimeout(300);

    // Both pages should update to 1
    await expect(page1.getByText('Counter: 1')).toBeVisible();
    await expect(page2.getByText('Counter: 1')).toBeVisible({ timeout: 2000 });

    // Click decrement in page2
    await page2.getByRole('button', { name: '-' }).first().click();
    await page2.waitForTimeout(300);

    // Both pages should update to 0
    await expect(page1.getByText('Counter: 0')).toBeVisible({ timeout: 2000 });
    await expect(page2.getByText('Counter: 0')).toBeVisible();

    // Verify file has correct value
    const fileContent = await fs.readFile(COUNTER_FILE, 'utf-8');
    expect(JSON.parse(fileContent)).toBe(0);

    await page1.close();
    await page2.close();
    await context.close();
  });

  test('external file changes propagate to all tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Load both pages
    await page1.goto('/');
    await page2.goto('/');

    // Both should show initial state
    await expect(page1.getByText('Counter: 0')).toBeVisible();
    await expect(page2.getByText('Counter: 0')).toBeVisible();

    // Update file externally
    await fs.writeFile(COUNTER_FILE, '99');

    // Both pages should update
    await expect(page1.getByText('Counter: 99')).toBeVisible({ timeout: 2000 });
    await expect(page2.getByText('Counter: 99')).toBeVisible({ timeout: 2000 });

    await page1.close();
    await page2.close();
    await context.close();
  });

  test('changes from one tab appear in others without page refresh', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    const page3 = await context.newPage();

    // Load all three pages
    await page1.goto('/');
    await page2.goto('/');
    await page3.goto('/');

    // All should show initial state
    await expect(page1.getByText('Counter: 0')).toBeVisible();
    await expect(page2.getByText('Counter: 0')).toBeVisible();
    await expect(page3.getByText('Counter: 0')).toBeVisible();

    // Increment from page1
    await page1.getByRole('button', { name: '+' }).first().click();
    await page1.waitForTimeout(200);

    // Increment from page2
    await page2.getByRole('button', { name: '+' }).first().click();
    await page2.waitForTimeout(200);

    // Increment from page3
    await page3.getByRole('button', { name: '+' }).first().click();
    await page3.waitForTimeout(500);

    // All pages should eventually show 3
    await expect(page1.getByText('Counter: 3')).toBeVisible({ timeout: 2000 });
    await expect(page2.getByText('Counter: 3')).toBeVisible({ timeout: 2000 });
    await expect(page3.getByText('Counter: 3')).toBeVisible({ timeout: 2000 });

    // Verify file has correct value
    const fileContent = await fs.readFile(COUNTER_FILE, 'utf-8');
    expect(JSON.parse(fileContent)).toBe(3);

    await page1.close();
    await page2.close();
    await page3.close();
    await context.close();
  });
});
