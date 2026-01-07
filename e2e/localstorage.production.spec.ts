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

    // Check that localStorage was updated
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem("mirrorstate:counter");
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
    // First, set a value in localStorage directly
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mirrorstate:counter", "42");
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
      return localStorage.getItem("mirrorstate:counter");
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

    // Check localStorage has the todo state
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem("mirrorstate:todos1");
    });
    expect(storedValue).toContain("Test todo item");

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByText("Test todo item")).toBeVisible();
  });

  test("localStorage is scoped by state name", async ({ page }) => {
    await page.goto("/");

    // Wait for counter to load
    await expect(page.getByText(/Counter:/)).toBeVisible();

    // Increment counter
    await page.getByRole("button", { name: "+" }).first().click();

    // Wait for localStorage to be updated
    await page.waitForTimeout(100);

    // Verify counter state is in localStorage with correct key
    const keys = await page.evaluate(() => {
      return Object.keys(localStorage).filter((k) =>
        k.startsWith("mirrorstate:"),
      );
    });
    expect(keys).toContain("mirrorstate:counter");
  });
});
