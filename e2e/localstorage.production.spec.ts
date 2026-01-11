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

    // Check that localStorage was updated (key includes hash: mirrorstate:<hash>:counter)
    const storedValue = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("mirrorstate:") && k.endsWith(":counter"),
      );
      return key ? localStorage.getItem(key) : null;
    });
    expect(JSON.parse(storedValue!)).toBe(expectedValue);
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
    // First, set a value in localStorage using the correct key format
    await page.goto("/");

    // Get the hash from existing localStorage keys after an update
    await page.getByRole("button", { name: "+" }).first().click();
    await page.waitForTimeout(100);

    // Find the key pattern and set our value
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("mirrorstate:") && k.endsWith(":counter"),
      );
      if (key) {
        localStorage.setItem(key, "42");
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

    // Verify localStorage matches (key includes hash: mirrorstate:<hash>:counter)
    const storedValue = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("mirrorstate:") && k.endsWith(":counter"),
      );
      return key ? localStorage.getItem(key) : null;
    });
    expect(JSON.parse(storedValue!)).toBe(expectedValue);

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

    // Check localStorage has the todo state (key includes hash: mirrorstate:<hash>:todos1)
    const storedValue = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (k) => k.startsWith("mirrorstate:") && k.endsWith(":todos1"),
      );
      return key ? localStorage.getItem(key) : null;
    });
    expect(storedValue).toContain("Test todo item");

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByText("Test todo item")).toBeVisible();
  });

  test("localStorage keys include hash for versioning", async ({ page }) => {
    await page.goto("/");

    // Wait for counter to load
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Increment counter
    await page.getByRole("button", { name: "+" }).first().click();

    // Wait for localStorage to be updated
    await page.waitForTimeout(100);

    // Verify counter state is in localStorage with hash in key (mirrorstate:<hash>:counter)
    const keys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) =>
        k.startsWith("mirrorstate:"),
      );
    });

    // Key should match pattern mirrorstate:<8-char-hash>:counter
    const counterKey = keys.find((k) => k.endsWith(":counter"));
    expect(counterKey).toBeTruthy();
    expect(counterKey).toMatch(/^mirrorstate:[a-f0-9]{8}:counter$/);
  });

  test("old localStorage data is ignored when hash changes", async ({
    page,
  }) => {
    // First, get the build-time initial value (after beforeEach clears localStorage)
    await page.goto("/");
    await expect(page.getByText(/Counter:/)).toBeVisible();
    const counterText = await page.getByText(/Counter:/).textContent();
    const buildTimeValue = parseInt(counterText!.replace("Counter: ", ""), 10);

    // Now clear localStorage and set a value with a fake old hash
    await page.evaluate(() => {
      localStorage.clear();
      // Set with a fake old hash (simulating data from a previous build)
      localStorage.setItem("mirrorstate:oldhash1:counter", "999");
    });

    // Reload the page
    await page.reload();

    // Counter should show build-time value, NOT 999 from old localStorage
    // because the hash doesn't match the current build
    await expect(
      page.getByText(`Counter: ${buildTimeValue}`),
    ).toBeVisible();

    // Verify the old hash key is still there but unused
    const oldKeyExists = await page.evaluate(() => {
      return localStorage.getItem("mirrorstate:oldhash1:counter") === "999";
    });
    expect(oldKeyExists).toBe(true);
  });
});
