type StateListener = (state: any) => void;

class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private listeners = new Map<string, Set<StateListener>>();
  private currentStates = new Map<string, any>();

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
    };

    this.ws.onclose = () => {
      this.cleanup();
    };

    this.ws.onerror = () => {
      console.error("WebSocket error");
      this.cleanup();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "initialState") {
          this.currentStates.set(data.name, data.state);
          this.notifyListeners(data.name, data.state);
        }

        if (data.type === "fileChange") {
          this.currentStates.set(data.name, data.state);
          this.notifyListeners(data.name, data.state);
        }
      } catch (error) {
        console.error("Error handling server message:", error);
      }
    };
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
    if (lastState === state) {
      return;
    }

    // Debounce rapid updates
    const timeout = setTimeout(() => {
      if (!this.ws) {
        return;
      }

      this.ws.send(JSON.stringify({ name, state }));
      this.currentStates.set(name, state);
      this.lastSentState.set(name, state);
      this.pendingUpdates.delete(name);
    }, 10);

    this.pendingUpdates.set(name, timeout);
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
