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
    filePattern: "**/*.mirror.json",
    prettyPrint: true,
    ...options,
  };

  let wss: WebSocketServer;
  let watcher: chokidar.FSWatcher;
  let recentWrites = new Set<string>(); // Track recent writes to prevent echo
  let lastMessageHash = new Map<string, string>(); // Track last message hash per client to prevent duplicates

  return {
    name: "vite-plugin-mirrorstate",
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

      watcher = chokidar.watch(opts.filePattern, {
        ignored: /node_modules/,
        persistent: true,
        ...opts.watchOptions,
      });

      logger(
        `MirrorState WebSocket listening on ws://localhost:${server.config.server.port || 5173}${wsPath}`,
      );

      watcher.on("change", (filePath) => {
        try {
          // Skip if this was a recent write from WebSocket to prevent echo
          if (recentWrites.has(filePath)) {
            recentWrites.delete(filePath);
            return;
          }

          const content = fs.readFileSync(filePath, "utf8");
          const data = JSON.parse(content);

          const relativePath = path.relative(
            server.config.root || process.cwd(),
            filePath,
          );
          const name = relativePath.replace(/\.mirror\.json$/, "");

          // This is an external file change (from editor, etc.)
          wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
              client.send(
                JSON.stringify({
                  type: "fileChange",
                  name,
                  state: data,
                  source: "external",
                }),
              );
            }
          });

          // Invalidate the virtual module for HMR
          const mod = server.moduleGraph.getModuleById(
            "virtual:mirrorstate/initial-states",
          );
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }

          logger(`Mirror file changed externally: ${name}`);
        } catch (error) {
          console.error(`Error reading mirror file ${filePath}:`, error);
        }
      });

      wss.on("connection", (ws) => {
        // Generate unique ID for this connection to prevent echo loops
        const clientId = Math.random().toString(36).substring(7);
        (ws as any).clientId = clientId;

        logger(`Client connected to MirrorState (${clientId})`);

        const pattern = Array.isArray(opts.filePattern)
          ? opts.filePattern
          : [opts.filePattern];
        const mirrorFiles = pattern.flatMap((p) =>
          glob.sync(p, { ignore: "node_modules/**" }),
        );

        mirrorFiles.forEach((filePath: string) => {
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const data = JSON.parse(content);

            const relativePath = path.relative(
              server.config.root || process.cwd(),
              filePath,
            );
            const name = relativePath.replace(/\.mirror\.json$/, "");

            ws.send(
              JSON.stringify({
                type: "initialState",
                name,
                state: data,
              }),
            );
          } catch (error) {
            console.error(
              `Error reading initial state from ${filePath}:`,
              error,
            );
          }
        });

        ws.on("message", (message) => {
          try {
            const messageStr = message.toString();
            const data = JSON.parse(messageStr);
            const { name, state } = data;

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

            const filePath = `${name}.mirror.json`;
            const jsonContent = opts.prettyPrint
              ? JSON.stringify(state, null, 2)
              : JSON.stringify(state);

            // Mark this as a recent write to prevent file watcher echo
            recentWrites.add(filePath);

            // Write state to file
            fs.writeFileSync(filePath, jsonContent);

            // Invalidate the virtual module for HMR
            const mod = server.moduleGraph.getModuleById(
              "virtual:mirrorstate/initial-states",
            );
            if (mod) {
              server.moduleGraph.invalidateModule(mod);
            }

            // Broadcast to other clients (exclude sender to prevent echo)
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === client.OPEN) {
                const relativePath = path.relative(
                  server.config.root || process.cwd(),
                  filePath,
                );
                const fileName = relativePath.replace(/\.mirror\.json$/, "");

                client.send(
                  JSON.stringify({
                    type: "fileChange",
                    name: fileName,
                    state: state,
                    source: clientId,
                  }),
                );
              }
            });

            logger(`Updated ${name} with state (from ${clientId}):`, state);
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
      if (
        id === "virtual:mirrorstate/config" ||
        id === "virtual:mirrorstate/initial-states"
      ) {
        return id;
      }
    },

    load(id) {
      if (id === "virtual:mirrorstate/config") {
        return `export const WS_PATH = "${opts.path}";`;
      }

      if (id === "virtual:mirrorstate/initial-states") {
        // During build, read all mirror files and inline them
        const pattern = Array.isArray(opts.filePattern)
          ? opts.filePattern
          : [opts.filePattern];
        const mirrorFiles = pattern.flatMap((p) =>
          glob.sync(p, { ignore: "node_modules/**" }),
        );

        const states: Record<string, any> = {};

        mirrorFiles.forEach((filePath: string) => {
          try {
            const content = fs.readFileSync(filePath, "utf8");
            const data = JSON.parse(content);
            const relativePath = path.relative(process.cwd(), filePath);
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
