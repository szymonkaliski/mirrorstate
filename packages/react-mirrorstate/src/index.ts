import { useEffect, useState } from "react";
import { produce, Draft } from "immer";
import { connectionManager } from "./connection-manager";

export function useMirrorState<T>(name: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // The connection manager handles both WebSocket (dev) and inlined state (production)
  useEffect(() => {
    // Subscribe to state changes for this name
    const unsubscribe = connectionManager.subscribe(name, (newState: T) => {
      setState(newState);
      setIsInitialized(true);
    });

    // Check if already initialized and has current state
    if (connectionManager.isInitialized(name)) {
      const currentState = connectionManager.getCurrentState(name);
      if (currentState !== undefined) {
        setState(currentState);
        setIsInitialized(true);
      }
    }

    // Set a timeout to mark as initialized even if no file exists
    const initTimeout = setTimeout(() => {
      if (!isInitialized && !connectionManager.isInitialized(name)) {
        setIsInitialized(true);
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(initTimeout);
    };
  }, [name, isInitialized]);

  const updateMirrorState = (updater: (draft: Draft<T>) => void) => {
    setState((prevState) => {
      const newState = produce(prevState, updater);
      connectionManager.updateState(name, newState);
      return newState;
    });
  };

  return [state, updateMirrorState] as const;
}

export default useMirrorState;
