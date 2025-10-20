import { useEffect, useState, useRef } from "react";
import { produce, Draft } from "immer";
import { connectionManager } from "./connection-manager";
import { INITIAL_STATES } from "virtual:mirrorstate/initial-states";

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

  const [state, setState] = useState<T | undefined>(
    () => (INITIAL_STATES?.[name] as T | undefined) ?? initialValueRef.current,
  );

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
    const currentState = connectionManager.getCurrentState(name) ?? state;
    const newState = produce(currentState as T, updater);

    connectionManager.updateState(name, newState);
    setState(newState);
  };

  return [state, updateMirrorState];
}

export default useMirrorState;
