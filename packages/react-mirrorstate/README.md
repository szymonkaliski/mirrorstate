# `react-mirrorstate`

React hook for bi-directional state synchronization in JSON on disk.

Requires Vite and `vite-plugin-mirrorstate` plugin.

Changes made in the UI are reflected on disk, and changes on disk propagate to the UI.

## Installation

```bash
npm install react-mirrorstate vite-plugin-mirrorstate
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

## API: `useMirrorState([key], [initialState])`

- `key`: String identifier for the state file (without `.mirror.json` extension)
- `initialState`: Default state if no persisted state exists

Returns `[state, updateState]` similar to React's `useState`, but:

- `state` is synchronized with `[key].mirror.json` file
- `updateState` accepts an Immer draft function for mutations

## License

MIT

