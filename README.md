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
});
```

3. Use the hook in your React component:

```tsx
import { useMirrorState } from "react-mirrorstate";

function App() {
  const [state, updateState] = useMirrorState("state", {
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

