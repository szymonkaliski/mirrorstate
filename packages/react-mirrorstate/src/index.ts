import { useEffect, useRef, useState } from 'react';
import { produce, Draft } from 'immer';
import { createLogger } from '@mirrorstate/shared';

const logger = createLogger('react-hook');

export function useMirrorState<T>(name: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    wsRef.current = new WebSocket('ws://localhost:8080');
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle initial state from server
        if (data.type === 'initialState' && data.name === name) {
          setState(data.state);
          setIsInitialized(true);
          logger.info(`Initial state loaded from file: ${name}`, data.state);
        }
        
        // Handle file changes from server
        if (data.type === 'fileChange' && data.name === name) {
          setState(data.state);
          logger.info(`State updated from file: ${name}`, data.state);
        }
      } catch (error) {
        logger.error('Error handling server message:', error);
      }
    };

    // Set a timeout to mark as initialized even if no file exists
    const initTimeout = setTimeout(() => {
      if (!isInitialized) {
        setIsInitialized(true);
        logger.info(`No existing file found for ${name}, using initial value`);
      }
    }, 1000);

    return () => {
      wsRef.current?.close();
      clearTimeout(initTimeout);
    };
  }, [name, isInitialized]);

  const updateMirrorState = (updater: (draft: Draft<T>) => void) => {
    setState(prevState => {
      const newState = produce(prevState, updater);
      // Send update to server to write to file
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ name, state: newState }));
      }
      return newState;
    });
  };

  return [state, updateMirrorState] as const;
}

export default useMirrorState;
