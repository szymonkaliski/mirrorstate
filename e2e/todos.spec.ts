import { test, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

const TODOS_FILE = path.join(__dirname, "../examples/todos1.mirror.json");

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
}

test.describe("Todo Example", () => {
  test.beforeEach(async () => {
    // Reset to empty todos before each test
    await fs.writeFile(TODOS_FILE, JSON.stringify({ todos: [] }, null, 2));
  });

  test("add, toggle, and delete todos", async ({ page }) => {
    await page.goto("/");

    // Find the specific todo section by looking for unique text
    // We'll target based on the code annotation
    const todoSection = page
      .locator('p:has-text("todos1.mirror.json")')
      .locator("..");
    await expect(todoSection).toBeVisible();

    // Add a todo
    const input = todoSection.getByPlaceholder("What needs to be done?");
    await input.fill("Buy milk");
    await input.press("Enter");

    // Verify in UI
    await expect(todoSection.getByText("Buy milk")).toBeVisible();

    // Wait for file to be written
    await page.waitForTimeout(200);

    // Verify in file
    let fileContent = JSON.parse(
      await fs.readFile(TODOS_FILE, "utf-8"),
    ) as TodoState;
    expect(fileContent.todos).toHaveLength(1);
    expect(fileContent.todos[0].text).toBe("Buy milk");
    expect(fileContent.todos[0].completed).toBe(false);

    // Add another todo
    await input.fill("Walk dog");
    await input.press("Enter");
    await page.waitForTimeout(200);

    // Verify second todo in file
    fileContent = JSON.parse(
      await fs.readFile(TODOS_FILE, "utf-8"),
    ) as TodoState;
    expect(fileContent.todos).toHaveLength(2);
    expect(fileContent.todos[1].text).toBe("Walk dog");

    // Toggle first todo
    const firstCheckbox = todoSection.getByRole("checkbox").first();
    await firstCheckbox.check();
    await page.waitForTimeout(200);

    // Verify completed in file
    fileContent = JSON.parse(
      await fs.readFile(TODOS_FILE, "utf-8"),
    ) as TodoState;
    expect(fileContent.todos[0].completed).toBe(true);

    // Verify strikethrough in UI
    const buyMilkText = todoSection.locator('span:has-text("Buy milk")');
    await expect(buyMilkText).toHaveCSS("text-decoration", /line-through/);

    // Delete first todo
    const deleteButtons = todoSection.getByRole("button", { name: "Delete" });
    await deleteButtons.first().click();
    await page.waitForTimeout(200);

    // Verify removed from UI
    await expect(todoSection.getByText("Buy milk")).not.toBeVisible();

    // Verify removed from file
    fileContent = JSON.parse(
      await fs.readFile(TODOS_FILE, "utf-8"),
    ) as TodoState;
    expect(fileContent.todos).toHaveLength(1);
    expect(fileContent.todos[0].text).toBe("Walk dog");
  });

  test("file changes update UI", async ({ page }) => {
    await page.goto("/");

    const todoSection = page
      .locator('p:has-text("todos1.mirror.json")')
      .locator("..");
    await expect(todoSection).toBeVisible();

    // Verify empty state
    await expect(todoSection.getByText("Buy milk")).not.toBeVisible();

    // Add todos by modifying file directly
    const newTodos: TodoState = {
      todos: [
        { id: "1", text: "External todo 1", completed: false },
        { id: "2", text: "External todo 2", completed: true },
      ],
    };
    await fs.writeFile(TODOS_FILE, JSON.stringify(newTodos, null, 2));

    // UI should reflect the changes
    await expect(todoSection.getByText("External todo 1")).toBeVisible({
      timeout: 2000,
    });
    await expect(todoSection.getByText("External todo 2")).toBeVisible({
      timeout: 2000,
    });

    // Verify the completed one has strikethrough
    const completedTodo = todoSection.locator(
      'span:has-text("External todo 2")',
    );
    await expect(completedTodo).toHaveCSS("text-decoration", /line-through/);

    // Wait before next change
    await page.waitForTimeout(300);

    // Clear all todos via file
    await fs.writeFile(TODOS_FILE, JSON.stringify({ todos: [] }, null, 2));

    // UI should update to show no todos
    await expect(todoSection.getByText("External todo 1")).not.toBeVisible({
      timeout: 2000,
    });
    await expect(todoSection.getByText("External todo 2")).not.toBeVisible({
      timeout: 2000,
    });
  });
});
