import { test, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

const COUNTER_FILE = path.join(__dirname, "../examples/counter.mirror.json");
const TODOS2_FILE = path.join(__dirname, "../examples/todos2.mirror.json");

test.describe("Initialization", () => {
  test.afterEach(async () => {
    await fs.writeFile(COUNTER_FILE, "0");
    await fs.writeFile(TODOS2_FILE, JSON.stringify({ todos: [] }, null, 2));
  });

  test("loads initial state from existing file synchronously", async ({
    page,
  }) => {
    // Set up counter with a specific value
    await fs.writeFile(COUNTER_FILE, "99");

    await page.goto("/");

    // Should show the initial value immediately (synchronously loaded)
    await expect(page.getByText("Counter: 99")).toBeVisible();

    // Click to verify state management works
    await page.getByRole("button", { name: "+" }).first().click();
    await page.waitForTimeout(200);

    await expect(page.getByText("Counter: 100")).toBeVisible();

    const fileContent = await fs.readFile(COUNTER_FILE, "utf-8");
    expect(JSON.parse(fileContent)).toBe(100);
  });

  test("creates file with initialValue when file is missing", async ({
    page,
  }) => {
    // Delete the todos2 file if it exists
    await fs.unlink(TODOS2_FILE).catch(() => {});

    await page.goto("/");

    // Wait for component to mount and file to be created
    await page.waitForTimeout(1000);

    // Verify file was created with initialValue
    const fileExists = await fs
      .access(TODOS2_FILE)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);

    const content = JSON.parse(await fs.readFile(TODOS2_FILE, "utf-8"));
    expect(content.todos).toEqual([]);

    // Verify UI works with the initial state
    const todoSection = page
      .locator('p:has-text("todos2.mirror.json")')
      .locator("..");
    await expect(todoSection).toBeVisible();

    // Add a todo to verify state management works
    const input = todoSection.getByPlaceholder("What needs to be done?");
    await input.fill("Test todo");
    await input.press("Enter");
    await page.waitForTimeout(200);

    await expect(todoSection.getByText("Test todo")).toBeVisible();

    const updated = JSON.parse(await fs.readFile(TODOS2_FILE, "utf-8"));
    expect(updated.todos).toHaveLength(1);
    expect(updated.todos[0].text).toBe("Test todo");
  });
});
