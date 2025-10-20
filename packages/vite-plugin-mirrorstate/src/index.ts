import { Plugin } from "vite";
import * as chokidar from "chokidar";
import { WebSocketServer } from "ws";
import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { glob } from "glob";
import debug from "debug";

const logger = debug("mirrorstate:vite-plugin");
const WS_PATH = "/mirrorstate";

export function mirrorStatePlugin(): Plugin {
  let wss: WebSocketServer;
  let watcher: chokidar.FSWatcher;
  let viteRoot: string;

  let fileSequences = new Map<string, number>(); // Track sequence number per file
  let ignoreNextChange = new Map<string, boolean>(); // Track our own writes to ignore echo from file watcher

  return {
    name: "vite-plugin-mirrorstate",

    configResolved(config) {
      viteRoot = config.root || process.cwd();
    },

    configureServer(server) {
      const invalidateVirtualModule = () => {
        const mod = server.moduleGraph.getModuleById(
          "\0virtual:mirrorstate/initial-states",
        );

        if (mod) {
          server.moduleGraph.invalidateModule(mod);
        }
      };

      wss = new WebSocketServer({ noServer: true });

      server.httpServer!.on("upgrade", (request, socket, head) => {
        if (request.url === WS_PATH) {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
          });
        }
      });

      logger(
        `MirrorState WebSocket listening on ws://localhost:${server.config.server.port || 5173}${WS_PATH}`,
      );

      const baseDir = server.config.root || process.cwd();

      logger(`Setting up file watcher for ${baseDir}`);

      watcher = chokidar.watch(baseDir, {
        ignored: (path, stats) => {
          // Ignore hidden files, node_modules
          if (path.includes("node_modules") || path.includes("/.")) {
            return true;
          }

          // Only watch .mirror.json files (and directories to traverse)
          if (stats?.isFile() && !path.endsWith(".mirror.json")) {
            return true;
          }

          return false;
        },
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on("add", (filePath) => {
        const relativePath = path.relative(baseDir, filePath);
        const name = relativePath.replace(/\.mirror\.json$/, "");

        invalidateVirtualModule();

        logger(`New mirror file added: ${name}`);
      });

      watcher.on("unlink", (filePath) => {
        const relativePath = path.relative(baseDir, filePath);
        const name = relativePath.replace(/\.mirror\.json$/, "");

        invalidateVirtualModule();

        logger(`Mirror file deleted: ${name}`);
      });

      watcher.on("change", (filePath) => {
        const relativePath = path.relative(baseDir, filePath);
        const name = relativePath.replace(/\.mirror\.json$/, "");

        // Skip if this is our own write (echo from file watcher)
        if (ignoreNextChange.get(name)) {
          ignoreNextChange.delete(name);
          logger(`Skipping file watcher echo for ${name}`);
          return;
        }

        let data: any;

        try {
          const content = fs.readFileSync(filePath, "utf8");
          data = JSON.parse(content);
        } catch (error) {
          console.error(`Error reading mirror file ${filePath}:`, error);
          return;
        }

        const currentSeq = fileSequences.get(name) ?? 0;
        const seq = currentSeq + 1;
        fileSequences.set(name, seq);

        // Broadcast file change with sequence number
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(
              JSON.stringify({
                type: "fileChange",
                name,
                state: data,
                seq,
              }),
            );
          }
        });

        invalidateVirtualModule();

        logger(`Mirror file changed externally: ${name} (seq: ${seq})`);
      });

      wss.on("connection", (ws) => {
        // Generate unique ID for this connection for logging purposes
        const clientId = Math.random().toString(36).substring(8);
        (ws as any).clientId = clientId;

        logger(`Client connected to MirrorState [${clientId}]`);

        ws.on("message", (message) => {
          const messageStr = message.toString();
          let data: any;

          try {
            data = JSON.parse(messageStr);
          } catch (error) {
            console.error("Error handling client message:", error);
            return;
          }

          const { name, state } = data;

          const baseDir = server.config.root || process.cwd();
          const relativeFilePath = `${name}.mirror.json`;
          const filePath = path.join(baseDir, relativeFilePath);
          const jsonContent = JSON.stringify(state, null, 2);

          // Increment sequence number for this file
          const currentSeq = fileSequences.get(name) ?? 0;
          const seq = currentSeq + 1;
          fileSequences.set(name, seq);

          // Set flag to ignore the next file change event (our own write)
          ignoreNextChange.set(name, true);

          // Write state to file
          fs.writeFileSync(filePath, jsonContent);

          // Broadcast to all OTHER clients (skip sender - they already applied optimistically)
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === client.OPEN) {
              client.send(
                JSON.stringify({
                  type: "fileChange",
                  seq,
                  name,
                  state,
                }),
              );
            }
          });

          invalidateVirtualModule();

          logger(`Updated ${name} (seq: ${seq}) from [${clientId}]:`, state);
        });

        ws.on("close", () => {
          logger(`Client [${clientId}] disconnected`);
        });
      });
    },

    resolveId(id) {
      if (
        id === "virtual:mirrorstate/config" ||
        id === "virtual:mirrorstate/initial-states"
      ) {
        return "\0" + id;
      }
    },

    async load(id) {
      if (id === "\0virtual:mirrorstate/config") {
        return `export const WS_PATH = "${WS_PATH}";`;
      }

      // During build, read all mirror files and inline them
      if (id === "\0virtual:mirrorstate/initial-states") {
        const baseDir = viteRoot || process.cwd();
        const mirrorFiles = glob.sync("**/*.mirror.json", {
          cwd: baseDir,
          ignore: "node_modules/**",
        });

        const filePromises = mirrorFiles.map(async (relativePath: string) => {
          const absolutePath = path.join(baseDir, relativePath);
          const name = relativePath.replace(/\.mirror\.json$/, "");

          let data;

          try {
            const content = await fsPromises.readFile(absolutePath, "utf8");
            data = JSON.parse(content);
          } catch (error) {
            console.error(
              `Error reading initial state from ${relativePath}:`,
              error,
            );

            return null;
          }

          logger(`Inlined initial state for ${name}`);

          return [name, data];
        });

        const results = await Promise.all(filePromises);
        const states: Record<string, any> = Object.fromEntries(
          results.filter((x) => x != null),
        );

        return `export const INITIAL_STATES = ${JSON.stringify(states)};`;
      }
    },

    closeBundle() {
      if (watcher) {
        watcher.close();
        logger("File watcher closed");
      }
      if (wss) {
        wss.close();
        logger("WebSocket server closed");
      }
    },
  };
}

export default mirrorStatePlugin;
