import { test, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

const SHARED_FILE = path.join(__dirname, "../examples/shared.mirror.json");

test.describe("Shared State Between Components", () => {
  test.beforeEach(async () => {
    await fs.writeFile(SHARED_FILE, "0");
  });

  test.afterAll(async () => {
    try {
      await fs.unlink(SHARED_FILE);
    } catch (e) {
      // File may not exist
    }
  });

  test("both components show same initial value", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: 0");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: 0");
  });

  test("update in ComponentA updates ComponentB", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: 0");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: 0");

    await page.getByTestId("component-a-increment").click();

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: 1");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: 1");

    await page.waitForTimeout(200);
    const fileContent = await fs.readFile(SHARED_FILE, "utf-8");
    expect(JSON.parse(fileContent)).toBe(1);
  });

  test("update in ComponentB updates ComponentA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: 0");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: 0");

    await page.getByTestId("component-b-decrement").click();

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: -1");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: -1");

    await page.waitForTimeout(200);
    const fileContent = await fs.readFile(SHARED_FILE, "utf-8");
    expect(JSON.parse(fileContent)).toBe(-1);
  });

  test("rapid alternating updates stay in sync", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: 0");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: 0");

    const incrementBtn = page.getByTestId("component-a-increment");
    const decrementBtn = page.getByTestId("component-b-decrement");

    // +1, -1, +1, -1, +1, +1, +1 = 3
    await incrementBtn.click();
    await decrementBtn.click();
    await incrementBtn.click();
    await decrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();

    await page.waitForTimeout(500);

    await expect(page.getByTestId("component-a-count")).toHaveText("Count: 3");
    await expect(page.getByTestId("component-b-count")).toHaveText("Count: 3");

    const fileContent = await fs.readFile(SHARED_FILE, "utf-8");
    expect(JSON.parse(fileContent)).toBe(3);
  });
});
