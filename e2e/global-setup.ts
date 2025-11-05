import fs from "fs/promises";
import path from "path";

async function globalSetup() {
  const examplesDir = path.join(__dirname, "../examples");

  const counterFile = path.join(examplesDir, "counter.mirror.json");
  const todos1File = path.join(examplesDir, "todos1.mirror.json");
  const todos2File = path.join(examplesDir, "todos2.mirror.json");

  await fs.writeFile(counterFile, "0");
  await fs.writeFile(todos1File, JSON.stringify({ todos: [] }, null, 2));
  await fs.writeFile(todos2File, JSON.stringify({ todos: [] }, null, 2));
}

export default globalSetup;
