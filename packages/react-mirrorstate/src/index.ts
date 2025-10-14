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
  const [state, setState] = useState<T | undefined>(
    () => (INITIAL_STATES?.[name] as T | undefined) ?? initialValue,
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
      initialValue !== undefined &&
      !hasCreatedFile.current
    ) {
      hasCreatedFile.current = true;
      connectionManager.updateState(name, initialValue);
    }

    return () => {
      unsubscribe();
    };
  }, [name, initialValue]);

  const updateMirrorState = (updater: (draft: Draft<T>) => void) => {
    setState((prevState) => {
      const newState = produce(prevState as T, updater);
      connectionManager.updateState(name, newState);
      return newState;
    });
  };

  return [state, updateMirrorState];
}

export default useMirrorState;
