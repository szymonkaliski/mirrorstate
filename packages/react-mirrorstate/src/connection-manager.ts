import { STATES_HASH } from "virtual:mirrorstate/initial-states";

type StateListener = (state: any) => void;

const LOCALSTORAGE_KEY = "mirrorstate";

interface StorageObject {
  __hash__: string;
  [key: string]: any;
}

class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private listeners = new Map<string, Set<StateListener>>();
  private currentStates = new Map<string, any>();
  private lastSeq = new Map<string, number>();
  private queuedUpdates = new Map<string, any>();

  private getStorageObject(): StorageObject | null {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(LOCALSTORAGE_KEY);
      if (stored !== null) {
        const obj = JSON.parse(stored) as StorageObject;
        // Check hash - if mismatch, discard and return null
        if (obj.__hash__ !== STATES_HASH) {
          window.localStorage.removeItem(LOCALSTORAGE_KEY);
          return null;
        }
        return obj;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  private saveToLocalStorage(name: string, state: any): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      // Load existing object or create new one
      let obj = this.getStorageObject();
      if (!obj) {
        obj = { __hash__: STATES_HASH };
      }
      obj[name] = state;
      window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }

  loadFromLocalStorage(name: string): any | undefined {
    const obj = this.getStorageObject();
    if (obj && name in obj) {
      return obj[name];
    }
    return undefined;
  }

  private async getWebSocketConfig() {
    try {
      const config = await import("virtual:mirrorstate/config");
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

  private cleanup(): void {
    this.isConnecting = false;
    this.ws = null;
    this.pendingUpdates.forEach((timeout) => clearTimeout(timeout));
    this.pendingUpdates.clear();
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

    const config = await this.getWebSocketConfig();
    const wsUrl = this.buildWebSocketURL(config.WS_PATH);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnecting = false;

      // Flush any queued updates
      this.queuedUpdates.forEach((state, name) => {
        this.updateState(name, state);
      });
      this.queuedUpdates.clear();
    };

    this.ws.onclose = () => {
      this.cleanup();
    };

    this.ws.onerror = (e) => {
      console.error("WebSocket error", e);
      this.cleanup();
    };

    this.ws.onmessage = (event) => {
      let data;

      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error("Error handling server message:", error);

        return;
      }

      if (data.type === "fileChange") {
        // Only apply updates with a higher sequence number
        const currentSeq = this.lastSeq.get(data.name) ?? -1;

        if (data.seq !== undefined && data.seq > currentSeq) {
          this.lastSeq.set(data.name, data.seq);
          this.currentStates.set(data.name, data.state);
          this.notifyListeners(data.name, data.state);
        }
      }
    };
  }

  subscribe(name: string, listener: StateListener): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }

    this.listeners.get(name)!.add(listener);

    this.connect();

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

  private pendingUpdates = new Map<string, NodeJS.Timeout>();

  updateState(name: string, state: any): void {
    // Immediately update currentStates so subsequent reads get the latest value
    this.currentStates.set(name, state);

    // Notify all local subscribers immediately (for same-page component sync)
    this.notifyListeners(name, state);

    // In production, persist to localStorage instead of WebSocket
    if (process.env.NODE_ENV === "production") {
      this.saveToLocalStorage(name, state);
      return;
    }

    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.queuedUpdates.set(name, state);
      return;
    }

    // Cancel any pending update for this state name
    const pendingUpdate = this.pendingUpdates.get(name);
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
    }

    // Debounce rapid WebSocket sends
    const timeout = setTimeout(() => {
      if (!this.ws) {
        return;
      }

      this.ws.send(
        JSON.stringify({
          name,
          state,
        }),
      );
      this.pendingUpdates.delete(name);
    }, 10);

    this.pendingUpdates.set(name, timeout);
  }

  getCurrentState(name: string): any {
    return this.currentStates.get(name);
  }

  getStatesHash(): string {
    return STATES_HASH;
  }

  private notifyListeners(name: string, state: any): void {
    const nameListeners = this.listeners.get(name);
    if (nameListeners) {
      nameListeners.forEach((listener) => listener(state));
    }
  }
}

export const connectionManager = new WebSocketConnectionManager();
