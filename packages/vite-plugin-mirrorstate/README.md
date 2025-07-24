# `vite-plugin-mirrorstate`

A Vite plugin that for bi-directional React state synchronization in JSON on disk.

Requires React and `react-mirrorstate` plugin.

Changes made in the UI are reflected on disk, and changes on disk propagate to the UI.

## Installation

```bash
npm install vite-plugin-mirrorstate react-mirrorstate
```

## Example

Create a `state.mirror.json` file:

```json
{
  "count": 20,
  "message": "Hello World"
}
```

Start `vite` with `vite-plugin-mirrorstate` enabled:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mirrorstate from "vite-plugin-mirrorstate";

export default defineConfig({
  plugins: [react(), mirrorstate()],
});
```

Set up a React component:

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

## Optional Configuration

```typescript
mirrorstate({
  port: 5174, // WebSocket server port
  watchPattern: "**/*.mirror.json", // Glob pattern for files to watch
});
```

## License

MIT

