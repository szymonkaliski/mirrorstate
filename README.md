# MirrorState

Bi-directional state synchronization between React and JSON files on disk.

Changes made in the UI are reflected on disk, and changes on disk propagate to the UI in real-time.

## Overview

This monorepo contains two packages that work together:

- **`react-mirrorstate`** - React hook for consuming synchronized state
- **`vite-plugin-mirrorstate`** - Vite plugin that handles file watching and WebSocket communication

## Installation

```bash
npm install react-mirrorstate vite-plugin-mirrorstate
```

## Quick Start

1. Create a `state.mirror.json` file:

```json
{
  "count": 20,
  "message": "Hello World"
}
```

2. Configure Vite with the plugin:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mirrorstate from "vite-plugin-mirrorstate";

export default defineConfig({
  plugins: [react(), mirrorstate()],
  optimizeDeps: {
    exclude: ["react-mirrorstate"],
  },
});
```

3. Use the hook in your React component:

**With initialValue (creates file if missing):**

```tsx
import { useMirrorState } from "react-mirrorstate";

interface State {
  count: number;
  message: string;
}

function App() {
  // State is loaded synchronously from state.mirror.json
  // If file doesn't exist, initialValue creates it
  const [state, updateState] = useMirrorState<State>("state", {
    count: 0,
    message: "",
  });

  return (
    <div>
      <p>
        {state.message}: {state.count}
      </p>
      <button
        onClick={() =>
          updateState((draft) => {
            draft.count++;
          })
        }
      >
        Increment
      </button>
    </div>
  );
}
```

**Without initialValue (reads existing file only):**

```tsx
import { useMirrorState } from "react-mirrorstate";

function Counter() {
  // State will be undefined if counter.mirror.json doesn't exist
  const [count, updateCount] = useMirrorState<number>("counter");

  if (count === undefined) {
    return <div>No counter file found. Create counter.mirror.json first.</div>;
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => updateCount((draft) => draft + 1)}>+</button>
    </div>
  );
}
```

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run development mode with examples
npm run dev

# Format code
npm run format
```

## License

MIT
