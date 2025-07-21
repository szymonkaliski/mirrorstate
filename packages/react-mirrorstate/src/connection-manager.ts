import { createLogger } from "@mirrorstate/shared";

const logger = createLogger("ws-manager");

type StateListener = (state: any) => void;

class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private listeners = new Map<string, Set<StateListener>>();
  private currentStates = new Map<string, any>();
  private initialized = new Set<string>();

  private getWebSocketConfig() {
    try {
      const config = require("virtual:mirrorstate/config");
      return config;
    } catch {
      return { WS_PATH: "/mirrorstate" };
    }
  }

  private buildWebSocketURL(path: string): string {
    if (typeof window === "undefined") {
      return `ws://localhost:5173${path}`;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}${path}`;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    if (process.env.NODE_ENV === "production") {
      // In production, don't create WebSocket but still allow loading initial state
      return;
    }

    this.isConnecting = true;

    const config = this.getWebSocketConfig();
    const wsUrl = this.buildWebSocketURL(config.WS_PATH);

    logger.debug(`Connecting to ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;
      logger.debug("WebSocket connected");
    };

    this.ws.onclose = () => {
      this.isConnecting = false;
      this.ws = null;
      logger.debug("WebSocket closed");
    };

    this.ws.onerror = () => {
      this.isConnecting = false;
      this.ws = null;
      logger.error("WebSocket error");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "initialState") {
          this.currentStates.set(data.name, data.state);
          this.initialized.add(data.name);
          this.notifyListeners(data.name, data.state);
          logger.info(`Initial state loaded: ${data.name}`, data.state);
        }

        if (data.type === "fileChange") {
          this.currentStates.set(data.name, data.state);
          this.notifyListeners(data.name, data.state);
          logger.info(`State updated: ${data.name}`, data.state);
        }
      } catch (error) {
        logger.error("Error handling server message:", error);
      }
    };
  }

  async getInlinedInitialStates(): Promise<Record<string, any>> {
    try {
      // Import the virtual module with inlined states
      const module = await import("virtual:mirrorstate/initial-states" as any);
      return module.INITIAL_STATES || {};
    } catch (error) {
      logger.debug("Failed to load virtual module:", error);
      return {};
    }
  }

  async loadInitialStateFromInline(name: string): Promise<any> {
    // Always try to load inlined states - works in both dev and production
    const inlinedStates = await this.getInlinedInitialStates();
    const state = inlinedStates[name];

    if (state !== undefined) {
      this.currentStates.set(name, state);
      this.initialized.add(name);
      logger.info(`Loaded inlined initial state: ${name}`, state);
      return state;
    }

    return undefined;
  }

  subscribe(name: string, listener: StateListener): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }

    this.listeners.get(name)!.add(listener);

    // Connect if not already connected (dev mode)
    this.connect();

    // If we already have state for this name, notify immediately
    if (this.currentStates.has(name)) {
      listener(this.currentStates.get(name));
    } else {
      // Try to load from inlined states (production) or wait for WebSocket (dev)
      this.loadInitialStateFromInline(name).then((state) => {
        if (state !== undefined) {
          this.notifyListeners(name, state);
        }
      });
    }

    return () => {
      const nameListeners = this.listeners.get(name);
      if (nameListeners) {
        nameListeners.delete(listener);
        if (nameListeners.size === 0) {
          this.listeners.delete(name);
        }
      }
    };
  }

  private lastSentState = new Map<string, any>();
  private pendingUpdates = new Map<string, NodeJS.Timeout>();

  updateState(name: string, state: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    // Cancel any pending update for this state name
    const pendingUpdate = this.pendingUpdates.get(name);
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
    }

    // Check if this is actually a different state
    const lastState = this.lastSentState.get(name);
    if (lastState && JSON.stringify(lastState) === JSON.stringify(state)) {
      logger.debug(`Skipping duplicate state update for ${name}`);
      return;
    }

    // Debounce rapid updates
    const timeout = setTimeout(() => {
      this.ws!.send(JSON.stringify({ name, state }));
      this.currentStates.set(name, state);
      this.lastSentState.set(name, state);
      this.pendingUpdates.delete(name);
      logger.debug(`Sent state update for ${name}`);
    }, 10); // 10ms debounce

    this.pendingUpdates.set(name, timeout);
  }

  isInitialized(name: string): boolean {
    return this.initialized.has(name);
  }

  getCurrentState(name: string): any {
    return this.currentStates.get(name);
  }

  private notifyListeners(name: string, state: any): void {
    const nameListeners = this.listeners.get(name);
    if (nameListeners) {
      nameListeners.forEach((listener) => listener(state));
    }
  }
}

export const connectionManager = new WebSocketConnectionManager();
