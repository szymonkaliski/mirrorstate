import { test, expect } from "@playwright/test";

test.describe("LocalStorage Persistence (Production)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app, clear localStorage, then reload to start fresh
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test("initial state loads from build-time values", async ({ page }) => {
    await page.goto("/");

    // Counter should show the initial value from the mirror.json file (0)
    await expect(page.getByText("Counter:")).toBeVisible();
  });

  test("state changes persist to localStorage", async ({ page }) => {
    await page.goto("/");

    // Wait for the counter to be visible first
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Get the initial counter value
    const counterText = await page.getByText(/Counter:/).textContent();
    const initialValue = parseInt(counterText!.replace("Counter: ", ""), 10);

    // Click increment button
    await page.getByRole("button", { name: "+" }).first().click();

    // Wait for UI update
    const expectedValue = initialValue + 1;
    await expect(page.getByText(`Counter: ${expectedValue}`)).toBeVisible();

    // Check that localStorage was updated (single object with __hash__ and counter)
    const storedValue = await page.evaluate(() => {
      const stored = localStorage.getItem("mirrorstate");
      if (!stored) return null;
      const obj = JSON.parse(stored);
      return obj.counter;
    });
    expect(storedValue).toBe(expectedValue);
  });

  test("localStorage state survives page reload", async ({ page }) => {
    await page.goto("/");

    // Wait for the counter to be visible
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Get initial counter text and value
    const counterText = await page.getByText(/Counter:/).textContent();
    const initialValue = parseInt(counterText!.replace("Counter: ", ""), 10);

    // Increment counter multiple times
    const incrementButton = page.getByRole("button", { name: "+" }).first();
    await incrementButton.click();
    await incrementButton.click();
    await incrementButton.click();

    const expectedValue = initialValue + 3;
    await expect(page.getByText(`Counter: ${expectedValue}`)).toBeVisible();

    // Reload the page
    await page.reload();

    // Counter should still show the expected value (loaded from localStorage)
    await expect(page.getByText(`Counter: ${expectedValue}`)).toBeVisible();
  });

  test("localStorage takes priority over build-time initial state", async ({
    page,
  }) => {
    // First, create a valid localStorage entry by clicking
    await page.goto("/");
    await page.getByRole("button", { name: "+" }).first().click();
    await page.waitForTimeout(100);

    // Get the current hash and modify counter value
    await page.evaluate(() => {
      const stored = localStorage.getItem("mirrorstate");
      if (stored) {
        const obj = JSON.parse(stored);
        obj.counter = 42;
        localStorage.setItem("mirrorstate", JSON.stringify(obj));
      }
    });

    // Reload the page
    await page.reload();

    // Counter should show 42 (from localStorage) not the build-time value
    await expect(page.getByText("Counter: 42")).toBeVisible();
  });

  test("multiple state updates accumulate correctly", async ({ page }) => {
    await page.goto("/");

    // Wait for counter to be visible
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Get initial value
    const counterText = await page.getByText(/Counter:/).textContent();
    const initialValue = parseInt(counterText!.replace("Counter: ", ""), 10);

    // Perform multiple increments and decrements
    const incrementButton = page.getByRole("button", { name: "+" }).first();
    const decrementButton = page.getByRole("button", { name: "-" }).first();

    await incrementButton.click();
    await incrementButton.click();
    await incrementButton.click();
    await decrementButton.click();

    const expectedValue = initialValue + 2;
    await expect(page.getByText(`Counter: ${expectedValue}`)).toBeVisible();

    // Verify localStorage matches
    const storedValue = await page.evaluate(() => {
      const stored = localStorage.getItem("mirrorstate");
      if (!stored) return null;
      const obj = JSON.parse(stored);
      return obj.counter;
    });
    expect(storedValue).toBe(expectedValue);

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByText(`Counter: ${expectedValue}`)).toBeVisible();
  });

  test("todo state persists to localStorage", async ({ page }) => {
    await page.goto("/");

    // Wait for todo input to be ready
    const todoInput = page.getByPlaceholder("What needs to be done?").first();
    await expect(todoInput).toBeVisible();

    // Add a todo
    await todoInput.fill("Test todo item");
    await todoInput.press("Enter");

    // Verify todo appears
    await expect(page.getByText("Test todo item")).toBeVisible();

    // Check localStorage has the todo state
    const storedValue = await page.evaluate(() => {
      const stored = localStorage.getItem("mirrorstate");
      if (!stored) return null;
      return stored;
    });
    expect(storedValue).toContain("Test todo item");

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByText("Test todo item")).toBeVisible();
  });

  test("localStorage uses single object with hash", async ({ page }) => {
    await page.goto("/");

    // Wait for counter to load
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Increment counter
    await page.getByRole("button", { name: "+" }).first().click();

    // Wait for localStorage to be updated
    await page.waitForTimeout(100);

    // Verify localStorage structure: single "mirrorstate" key with __hash__ field
    const storageInfo = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const stored = localStorage.getItem("mirrorstate");
      if (!stored) return { keys, obj: null };
      const obj = JSON.parse(stored);
      return {
        keys,
        hasHash: "__hash__" in obj,
        hashLength: obj.__hash__?.length,
        hasCounter: "counter" in obj,
      };
    });

    expect(storageInfo.keys).toContain("mirrorstate");
    expect(storageInfo.keys.length).toBe(1); // Only one key
    expect(storageInfo.hasHash).toBe(true);
    expect(storageInfo.hashLength).toBe(8);
    expect(storageInfo.hasCounter).toBe(true);
  });

  test("old localStorage data is cleared when hash changes", async ({
    page,
  }) => {
    // First, get the build-time initial value (after beforeEach clears localStorage)
    await page.goto("/");
    await expect(page.getByText(/Counter:/)).toBeVisible();
    const counterText = await page.getByText(/Counter:/).textContent();
    const buildTimeValue = parseInt(counterText!.replace("Counter: ", ""), 10);

    // Set localStorage with a fake old hash
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "mirrorstate",
        JSON.stringify({ __hash__: "oldhash1", counter: 999 }),
      );
    });

    // Reload the page
    await page.reload();

    // Counter should show build-time value, NOT 999 from old localStorage
    // because the hash doesn't match and the old data was cleared
    await expect(page.getByText(`Counter: ${buildTimeValue}`)).toBeVisible();

    // Old localStorage should be cleared (or replaced with new hash)
    const storageCleared = await page.evaluate(() => {
      const stored = localStorage.getItem("mirrorstate");
      if (!stored) return true;
      const obj = JSON.parse(stored);
      return obj.__hash__ !== "oldhash1";
    });
    expect(storageCleared).toBe(true);
  });
});
