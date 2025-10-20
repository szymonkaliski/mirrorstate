import { Plugin } from "vite";
import * as chokidar from "chokidar";
import { WebSocketServer } from "ws";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import debug from "debug";

const logger = debug("mirrorstate:vite-plugin");

export interface MirrorStatePluginOptions {
  path?: string;
  filePattern?: string | string[];
  watchOptions?: any;
  prettyPrint?: boolean;
}

export function mirrorStatePlugin(
  options: MirrorStatePluginOptions = {},
): Plugin {
  const opts = {
    path: "/mirrorstate",
    filePattern: ["*.mirror.json", "**/*.mirror.json"],
    prettyPrint: true,
    ...options,
  };

  let wss: WebSocketServer;
  let watcher: chokidar.FSWatcher;
  let fileSequences = new Map<string, number>(); // Track sequence number per file
  let lastWrittenState = new Map<string, string>(); // Track last written state hash per file to detect external changes
  let lastMessageHash = new Map<string, string>(); // Track last message hash per client to prevent duplicates
  let watcherReady = false; // Track if watcher has finished initial scan
  let viteRoot: string; // Captured vite root directory

  return {
    name: "vite-plugin-mirrorstate",
    configResolved(config) {
      // Capture vite root for use in other hooks
      viteRoot = config.root || process.cwd();
    },
    configureServer(server) {
      const wsPath = opts.path;

      wss = new WebSocketServer({ noServer: true });

      server.httpServer!.on("upgrade", (request, socket, head) => {
        if (request.url === wsPath) {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
          });
        }
      });

      const baseDir = server.config.root || process.cwd();
      const pattern = Array.isArray(opts.filePattern)
        ? opts.filePattern.map((p) => path.join(baseDir, p))
        : [path.join(baseDir, opts.filePattern)];

      // Find all existing files matching the pattern
      const existingFiles = pattern.flatMap((p) =>
        glob.sync(p, {
          ignore: "node_modules/**",
        }),
      );

      logger(
        `Setting up file watcher for ${existingFiles.length} files: ${JSON.stringify(existingFiles)}`,
      );

      // Watch both existing files AND the directory for new files
      const watchTargets = [...existingFiles, baseDir];

      watcher = chokidar.watch(watchTargets, {
        ignored: /node_modules/,
        persistent: true,
        ...opts.watchOptions,
      });

      watcher.on("add", (filePath) => {
        // Only process .mirror.json files added after initial scan
        if (!watcherReady || !filePath.endsWith(".mirror.json")) {
          return;
        }

        try {
          const relativePath = path.relative(baseDir, filePath);
          const content = fs.readFileSync(filePath, "utf8");
          const data = JSON.parse(content);
          const name = relativePath.replace(/\.mirror\.json$/, "");

          // Send new state to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
              client.send(
                JSON.stringify({
                  type: "initialState",
                  name,
                  state: data,
                }),
              );
            }
          });

          // Invalidate the virtual module for HMR
          const mod = server.moduleGraph.getModuleById(
            "\0virtual:mirrorstate/initial-states",
          );
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }

          logger(`New mirror file added: ${name}`);
        } catch (error) {
          console.error(`Error reading new mirror file ${filePath}:`, error);
        }
      });

      watcher.on("unlink", (filePath) => {
        // Only process .mirror.json files
        if (!filePath.endsWith(".mirror.json")) {
          return;
        }

        try {
          const relativePath = path.relative(baseDir, filePath);
          const name = relativePath.replace(/\.mirror\.json$/, "");

          // Invalidate the virtual module for HMR
          const mod = server.moduleGraph.getModuleById(
            "\0virtual:mirrorstate/initial-states",
          );
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }

          logger(`Mirror file deleted: ${name}`);
        } catch (error) {
          console.error(
            `Error handling mirror file deletion ${filePath}:`,
            error,
          );
        }
      });

      watcher.on("ready", () => {
        watcherReady = true;
        logger("File watcher is ready");
      });

      logger(
        `MirrorState WebSocket listening on ws://localhost:${server.config.server.port || 5173}${wsPath}`,
      );

      watcher.on("change", (filePath) => {
        // Only watch .mirror.json files
        if (!filePath.endsWith(".mirror.json")) {
          return;
        }

        try {
          const relativePath = path.relative(baseDir, filePath);
          const content = fs.readFileSync(filePath, "utf8");
          const data = JSON.parse(content);

          const name = relativePath.replace(/\.mirror\.json$/, "");

          // Create hash of the state to detect if this is our own write
          const stateHash = JSON.stringify(data);
          const lastHash = lastWrittenState.get(name);

          // Skip if this matches what we just wrote (echo from our own write)
          if (lastHash === stateHash) {
            logger(`Skipping file watcher echo for ${name}`);
            return;
          }

          // This is an external change - increment sequence number
          const currentSeq = fileSequences.get(name) ?? 0;
          const seq = currentSeq + 1;
          fileSequences.set(name, seq);

          // Update our record of the last written state
          lastWrittenState.set(name, stateHash);

          // Broadcast file change with sequence number
          wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
              client.send(
                JSON.stringify({
                  type: "fileChange",
                  name,
                  state: data,
                  seq,
                  source: "external",
                }),
              );
            }
          });

          // Invalidate the virtual module for HMR
          const mod = server.moduleGraph.getModuleById(
            "\0virtual:mirrorstate/initial-states",
          );
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }

          logger(`Mirror file changed externally: ${name} (seq: ${seq})`);
        } catch (error) {
          console.error(`Error reading mirror file ${filePath}:`, error);
        }
      });

      wss.on("connection", (ws) => {
        // Generate unique ID for this connection to prevent echo loops
        const clientId = Math.random().toString(36).substring(7);
        (ws as any).clientId = clientId;

        logger(`Client connected to MirrorState (${clientId})`);

        // Send clientId to the client
        const connectedMessage = JSON.stringify({
          type: "connected",
          clientId,
        });
        logger(`Sending connected message: ${connectedMessage}`);
        ws.send(connectedMessage);

        ws.on("message", (message) => {
          try {
            const messageStr = message.toString();
            const data = JSON.parse(messageStr);
            const { clientId: msgClientId, name, state } = data;

            // Create a hash of the message to detect duplicates
            const messageHash = `${name}:${JSON.stringify(state)}`;
            const lastHash = lastMessageHash.get(clientId);

            // Skip if this is a duplicate message from the same client
            if (lastHash === messageHash) {
              logger(`Skipping duplicate message from ${clientId} for ${name}`);
              return;
            }

            // Update last message hash for this client
            lastMessageHash.set(clientId, messageHash);

            const baseDir = server.config.root || process.cwd();
            const relativeFilePath = `${name}.mirror.json`;
            const filePath = path.join(baseDir, relativeFilePath);
            const jsonContent = opts.prettyPrint
              ? JSON.stringify(state, null, 2)
              : JSON.stringify(state);

            // Increment sequence number for this file BEFORE writing
            const currentSeq = fileSequences.get(name) ?? 0;
            const seq = currentSeq + 1;
            fileSequences.set(name, seq);

            // Record state hash to detect our own write in file watcher
            lastWrittenState.set(name, JSON.stringify(state));

            // Write state to file
            fs.writeFileSync(filePath, jsonContent);

            // Invalidate the virtual module for HMR
            const mod = server.moduleGraph.getModuleById(
              "\0virtual:mirrorstate/initial-states",
            );
            if (mod) {
              server.moduleGraph.invalidateModule(mod);
            }

            // Broadcast to all OTHER clients (skip sender - they already applied optimistically)
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === client.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "fileChange",
                    clientId: msgClientId,
                    seq,
                    name,
                    state: state,
                  }),
                );
              }
            });

            logger(`Updated ${name} (seq: ${seq}) from ${clientId}:`, state);
          } catch (error) {
            console.error("Error handling client message:", error);
          }
        });

        ws.on("close", () => {
          // Clean up client data on disconnect
          lastMessageHash.delete(clientId);
          logger(`Client ${clientId} disconnected`);
        });
      });
    },

    resolveId(id) {
      if (id === "virtual:mirrorstate/config") {
        return "\0" + id;
      }
      if (id === "virtual:mirrorstate/initial-states") {
        return "\0" + id;
      }
    },

    load(id) {
      if (id === "\0virtual:mirrorstate/config") {
        return `export const WS_PATH = "${opts.path}";`;
      }

      if (id === "\0virtual:mirrorstate/initial-states") {
        // During build, read all mirror files and inline them
        // Use vite root instead of process.cwd() to handle monorepos correctly
        const baseDir = viteRoot || process.cwd();
        const pattern = Array.isArray(opts.filePattern)
          ? opts.filePattern.map((p) => path.join(baseDir, p))
          : [path.join(baseDir, opts.filePattern)];
        const mirrorFiles = pattern.flatMap((p) =>
          glob.sync(p, {
            ignore: "node_modules/**",
          }),
        );

        const states: Record<string, any> = {};

        mirrorFiles.forEach((filePath: string) => {
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const data = JSON.parse(content);
            // Use baseDir (vite root) for relative path calculation
            const relativePath = path.relative(baseDir, filePath);
            const name = relativePath.replace(/\.mirror\.json$/, "");
            states[name] = data;
            logger(`Inlined initial state for ${name}`);
          } catch (error) {
            console.error(
              `Error reading initial state from ${filePath}:`,
              error,
            );
          }
        });

        return `export const INITIAL_STATES = ${JSON.stringify(states, null, 2)};`;
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
