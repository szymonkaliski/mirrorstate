type StateListener = (state: any) => void;

class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private listeners = new Map<string, Set<StateListener>>();
  private currentStates = new Map<string, any>();
  private clientId: string | null = null;
  private lastSeq = new Map<string, number>();
  private queuedUpdates = new Map<string, any>();

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

        if (data.type === "connected") {
          this.clientId = data.clientId;

          // Flush any queued updates
          this.queuedUpdates.forEach((state, name) => {
            this.updateState(name, state);
          });
          this.queuedUpdates.clear();
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

    // Don't immediately notify with currentStates here - it might be stale
    // and could revert optimistic updates. The component initializes from
    // INITIAL_STATES, and the server will send initialState messages when
    // the connection is established, which will update all subscribers.

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
    if (this.ws?.readyState !== WebSocket.OPEN || !this.clientId) {
      this.queuedUpdates.set(name, state);
      return;
    }

    // Cancel any pending update for this state name
    const pendingUpdate = this.pendingUpdates.get(name);
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
    }

    // Debounce rapid updates
    const timeout = setTimeout(() => {
      if (!this.ws || !this.clientId) {
        return;
      }

      this.ws.send(JSON.stringify({
        clientId: this.clientId,
        name,
        state
      }));
      this.currentStates.set(name, state);
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
