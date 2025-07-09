import { useEffect, useRef, useState } from 'react';

export function useMirrorState<T>(name: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    wsRef.current = new WebSocket('ws://localhost:8080');
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle file changes from server
        if (data.type === 'fileChange' && data.name === name) {
          setState(data.state);
          console.log(`State updated from file: ${name}`, data.state);
        }
      } catch (error) {
        console.error('Error handling server message:', error);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, [name]);

  const updateMirrorState = (updater: (draft: T) => T) => {
    setState(prevState => {
      const newState = updater(prevState);
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
