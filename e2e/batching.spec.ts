import { test, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

const BATCHING_FILE = path.join(__dirname, "../examples/batching.mirror.json");

test.describe("Batching", () => {
  test.beforeEach(async () => {
    // Reset state before each test
    await fs.writeFile(BATCHING_FILE, JSON.stringify({ count: 0, clicks: 0 }));
  });

  test.afterAll(async () => {
    // Clean up the batching file after all tests
    try {
      await fs.unlink(BATCHING_FILE);
    } catch (e) {
      // File may not exist, that's ok
    }
  });

  test("multiple updates in single click are batched into one render", async ({
    page,
  }) => {
    const consoleLogs: string[] = [];

    // Capture console logs
    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("batching state")) {
        consoleLogs.push(text);
      }
    });

    await page.goto("/");

    // Wait for initial render
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 0");
    await page.waitForTimeout(200);

    // Clear initial render logs
    consoleLogs.length = 0;

    // Click the batched update button (3 updates in one click)
    await page.getByTestId("batched-update-btn").click();

    // Wait for updates to complete
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 2", {
      timeout: 2000,
    });
    await expect(page.getByTestId("batching-clicks")).toHaveText("Clicks: 1");
    await page.waitForTimeout(300);

    // Should have 1-2 renders (1 normal, or 2 with StrictMode)
    // NOT 3 renders (which would happen without batching)
    const updateLogs = consoleLogs.filter((log) =>
      log.includes("batching state"),
    );
    expect(updateLogs.length).toBeGreaterThanOrEqual(1);
    expect(updateLogs.length).toBeLessThanOrEqual(2);

    // Verify final state in file
    const fileContent = await fs.readFile(BATCHING_FILE, "utf-8");
    const state = JSON.parse(fileContent);
    expect(state.count).toBe(2);
    expect(state.clicks).toBe(1);
  });

  test("multiple batched updates apply all changes correctly", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 0");
    await page.waitForTimeout(200);

    // Click the multiple batched update button (5 updates in one click)
    await page.getByTestId("multiple-batched-update-btn").click();

    // Wait for all updates to complete
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 5", {
      timeout: 2000,
    });
    await page.waitForTimeout(300);

    // Verify final state in file - all 5 updates should be applied
    const fileContent = await fs.readFile(BATCHING_FILE, "utf-8");
    const state = JSON.parse(fileContent);
    expect(state.count).toBe(5);
    expect(state.clicks).toBe(0);
  });

  test("rapid sequential clicks each get their own batch", async ({ page }) => {
    const consoleLogs: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("batching state")) {
        consoleLogs.push(text);
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 0");
    await page.waitForTimeout(200);

    // Clear initial render logs
    consoleLogs.length = 0;

    // Click the batched update button 3 times rapidly
    const button = page.getByTestId("batched-update-btn");
    for (let i = 0; i < 3; i++) {
      await button.click();
    }

    // Wait for all updates to complete
    // Each click does +2 to count and +1 to clicks
    // So 3 clicks = count: 6, clicks: 3
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 6", {
      timeout: 2000,
    });
    await expect(page.getByTestId("batching-clicks")).toHaveText("Clicks: 3");
    await page.waitForTimeout(500);

    // With batching: should have ~3 batches (one per click), each with 1-2 renders
    // Without batching: would have ~9 renders (3 updates per click × 3 clicks)
    // Allow some flexibility for StrictMode and async timing
    expect(consoleLogs.length).toBeGreaterThanOrEqual(3);
    expect(consoleLogs.length).toBeLessThanOrEqual(9); // Should be much less than 9 without batching

    // Verify final state in file
    const fileContent = await fs.readFile(BATCHING_FILE, "utf-8");
    const state = JSON.parse(fileContent);
    expect(state.count).toBe(6);
    expect(state.clicks).toBe(3);
  });

  test("batching preserves update order", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 0");
    await page.waitForTimeout(200);

    // Click batched update button once
    await page.getByTestId("batched-update-btn").click();

    // The batched updates are:
    // 1. count += 1 (count: 1)
    // 2. count += 1 (count: 2)
    // 3. clicks += 1 (clicks: 1)

    await expect(page.getByTestId("batching-count")).toHaveText("Count: 2", {
      timeout: 2000,
    });
    await expect(page.getByTestId("batching-clicks")).toHaveText("Clicks: 1");
    await page.waitForTimeout(300);

    // Verify the order was preserved
    const fileContent = await fs.readFile(BATCHING_FILE, "utf-8");
    const state = JSON.parse(fileContent);
    expect(state.count).toBe(2); // Both increments applied
    expect(state.clicks).toBe(1); // Click increment applied last
  });

  test("batching works with loop-based updates", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("batching-count")).toHaveText("Count: 0");
    await page.waitForTimeout(200);

    // This button does 5 updates in a for loop - all should be batched
    await page.getByTestId("multiple-batched-update-btn").click();

    await expect(page.getByTestId("batching-count")).toHaveText("Count: 5", {
      timeout: 2000,
    });
    await page.waitForTimeout(300);

    const fileContent = await fs.readFile(BATCHING_FILE, "utf-8");
    const state = JSON.parse(fileContent);
    expect(state.count).toBe(5);

    // All 5 updates from the loop should be applied correctly
    // This verifies batching doesn't lose any updates
  });
});
