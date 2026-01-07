import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = process.env.TEST_PORT || "4173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.production.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build --workspace=examples && PORT=${TEST_PORT} npm run preview --workspace=examples`,
    url: `http://localhost:${TEST_PORT}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
