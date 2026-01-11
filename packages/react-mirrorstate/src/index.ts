import { useEffect, useState, useRef } from "react";
import { produce, type Draft, type Immutable } from "immer";
import { connectionManager } from "./connection-manager";
import { INITIAL_STATES } from "virtual:mirrorstate/initial-states";

// Re-export immer types for end users
export { type Draft, type Immutable } from "immer";
export { produce };

// Batching state for each mirror state name
const batchQueues = new Map<string, Array<(draft: Draft<any>) => void>>();
const batchPending = new Map<string, boolean>();

function scheduleBatchFlush<T>(name: string): void {
  if (batchPending.get(name)) {
    return;
  }

  batchPending.set(name, true);

  queueMicrotask(() => {
    const queue = batchQueues.get(name);

    if (!queue || queue.length === 0) {
      batchPending.set(name, false);
      return;
    }

    // Apply all queued updates in sequence
    // Get current state from connection manager, falling back to INITIAL_STATES
    let currentState =
      connectionManager.getCurrentState(name) ??
      (INITIAL_STATES?.[name] as T | undefined);

    // Apply each update sequentially, handling both object mutations and primitive returns
    let newState = currentState;
    queue.forEach((updater) => {
      newState = produce(newState as T, updater);
    });

    // Clear the queue
    batchQueues.set(name, []);
    batchPending.set(name, false);

    // Update connection manager (which notifies all subscribers)
    connectionManager.updateState(name, newState);
  });
}

export function useMirrorState<T>(
  name: string,
): [T | undefined, (updater: (draft: Draft<T>) => void) => void];

export function useMirrorState<T>(
  name: string,
  initialValue: T,
): [T, (updater: (draft: Draft<T>) => void) => void];

export function useMirrorState<T>(name: string, initialValue?: T) {
  // Capture initialValue once on first render to make it stable
  const initialValueRef = useRef(initialValue);

  const [state, setState] = useState<T | undefined>(() => {
    // In production, check localStorage first for persisted state
    if (process.env.NODE_ENV === "production") {
      const storedState = connectionManager.loadFromLocalStorage(name);
      if (storedState !== undefined) {
        return storedState as T;
      }
    }
    // Fall back to build-time initial states or user-provided initialValue
    return (INITIAL_STATES?.[name] as T | undefined) ?? initialValueRef.current;
  });

  const hasCreatedFile = useRef(false);

  useEffect(() => {
    // Subscribe to state changes for this name
    const unsubscribe = connectionManager.subscribe(name, (newState: T) => {
      setState(newState);
    });

    // If file doesn't exist and initialValue was provided, create it
    if (
      INITIAL_STATES?.[name] === undefined &&
      initialValueRef.current !== undefined &&
      !hasCreatedFile.current
    ) {
      hasCreatedFile.current = true;
      connectionManager.updateState(name, initialValueRef.current);
    }

    return () => {
      unsubscribe();
    };
  }, [name]);

  const updateMirrorState = (updater: (draft: Draft<T>) => void) => {
    // Initialize batch queue for this name if needed
    if (!batchQueues.has(name)) {
      batchQueues.set(name, []);
    }

    // Add updater to batch queue
    batchQueues.get(name)!.push(updater);

    // Schedule batch flush
    scheduleBatchFlush<T>(name);
  };

  return [state, updateMirrorState];
}

export default useMirrorState;
