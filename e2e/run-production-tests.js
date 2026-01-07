#!/usr/bin/env node
import getPort from "get-port";
import { spawn } from "child_process";

const port = await getPort();

const child = spawn(
  "npx",
  [
    "playwright",
    "test",
    "--config=playwright.production.config.ts",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, TEST_PORT: String(port) },
  },
);

child.on("exit", (code) => {
  process.exit(code);
});
