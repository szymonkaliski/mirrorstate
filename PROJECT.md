# MirrorState

React library and Vite plugin for bidirectional state synchronization through `*.mirror.json` files, file-watcher, and websockets.

## Goals

- treat `*.mirror.json` files as live state during Vite development (ignoring production for now)
- support two‑way sync: UI <-> file <-> UI
- ship as NPM packages: `vite-plugin-mirrorstate` (dev‑side) and `react-mirrorstate` (client‑side)
- require zero manual configuration for the common path
- fully typed TypeScript APIs

## High-Level Architecture

### Vite Plugin

- detect and file-watch files matching `/\.mirror\.json$/`
- on file save:
  - deserialize new content 
  - broadcast changes(or whole document?) to clients
- sets up a websocket that the client connect to

### React Plugin

- connects to the websocket exposed by the plugin
- provide `useMirrorState<T>(name: string)` hook - should work like `useImmer`, returning:
  - an immutable current state
  - `updateMirrorState` function which allows users to imperatively update the state, and on the callback edit, the `[name].mirror.json` file gets written

## Commands

- install dependencies: `npm install`
- start development: `npm run dev:plugin` & `npm run dev:react`
- build packages: `npm run build`
- run examples: `npm run examples`

## Feature: Project Scaffold

- [x] set up `git` repo @done(2025-01-09)
- [x] set up directories for:
  - [x] Vite plugin @done(2025-01-09)
  - [x] React library @done(2025-01-09)
  - [x] an examples directory - scaffold projects with minimal React + Vite code, don't use `create-react-app` etc. @done(2025-01-09)
- [x] set up basic Vite and React code together with a simple counter example (where the count is persisted in MirrorState) @done(2025-01-09)

## Feature: Todo Example

- [x] create a simple Todo list example which stores the state in MirrorState @done(2025-01-09)
- [x] use `immer` to expose an imperative-like API for modifying the state, as described in the project architecture @done(2025-01-09)

## Feature: Consolidated Examples

- [x] add a single `npm run examples` which starts the examples @done(2025-01-09)
- [x] the UI should show a list of examples that can be navigated to @done(2025-01-09)
- [x] have a single React & Vite project for the examples, instead of separate directories @done(2025-01-09)
- [x] update Running section in this document @done(2025-01-09)

## Feature: Initial State Persistence

- [x] fix useMirrorState to read initial state from existing .mirror.json files @done(2025-01-09)
- [x] add WebSocket protocol support for initial state loading @done(2025-01-09)
- [x] implement file scanning with glob to find existing mirror files @done(2025-01-09)
- [x] add proper initialization tracking in React hook @done(2025-01-09)

## Feature: Development Experience Improvements

- [x] add concurrently for running multiple processes simultaneously @done(2025-01-09)
- [x] enhance npm scripts with colored prefixes for better debugging @done(2025-01-09)
- [x] improve error handling and ES module compatibility @done(2025-01-09)
- [x] streamline development workflow with single npm run dev command @done(2025-01-09)

## Feature: Better Logs

- [x] add timestamps and colors to logs @done(2025-01-16)

## Feature: Implementation Review

- [x] review constants used in code - we seem to rely on `localhost` and specific websocket port, can we follow more of Vite approach with configuration, auto-finding ports, etc? -> for example running with `8080` used results in error! @done(2025-01-16)
- [x] review anything else and think hard what did we miss here @done(2025-01-16)
  - [x] create a new Feature entry here after this one that collects the review fixes to be applied @done(2025-01-16)

## Feature: Architecture Improvements

- [x] reuse Vite's existing WebSocket & HTTP server instead of starting separate server on port 8080 @done(2025-01-16)
  - [x] attach `WebSocketServer` with `noServer` true to Vite's `httpServer` @done(2025-01-16)
  - [x] use configurable (unique by default) path like `/mirrorstate` instead of separate port @done(2025-01-16)
  - [x] build WebSocket URL from `location.host` instead of hardcoded `localhost:8080` @done(2025-01-16)

- [x] fix file identifier system to use full relative paths instead of `basename` only @done(2025-01-16)
  - [x] prevents collisions when multiple files have same name in different directories @done(2025-01-16)
  - [x] use `path.relative(root, filePath)` as identifier @done(2025-01-16)

- [x] add configuration options with `MirrorStatePluginOptions` interface @done(2025-01-16)
  - [x] `path`, `filePattern`, `watchOptions`, pretty print control @done(2025-01-16)
  - [x] provide virtual module `virtual:mirrorstate/config` for compile-time constants @done(2025-01-16)

- [x] improve error handling and robustness @done(2025-01-16)
  - [x] fix `useEffect` dependencies to prevent multiple socket connections @done(2025-01-16)
  - [x] add cleanup hooks in `closeBundle` @done(2025-01-16)

- [x] enhance development experience @done(2025-01-16)
  - [x] friendly startup messages showing WebSocket endpoint @done(2025-01-16)
  - [x] respect LOG_LEVEL for logging @done(2025-01-16)

- [x] add production mode that disables `WebSocket` connections @done(2025-01-16)
  - [x] it should still return the content of mirror state on boot, not `undefined` @done(2025-01-16)

## Feature: Examples Polish

- [x] remove all styling from the examples, keep the CSS extremely minimal, it's ok if things use default DOM elements, the goal is to show the functionality @done(2025-07-21)
- [x] keep both the counter and the todo on the same page, so no internal navigation is necessary @done(2025-07-21)
- [x] make the code as minimal as possible, the goal is to highlight the library use, nothing else @done(2025-07-21)

## Feature: Synchronous Initial State

Current implementation has a race condition where `initialValue` parameter can overwrite existing `.mirror.json` files:

Race timeline:

1. Component mounts: `useState(initialValue)` (e.g., `{ todos: [] }`)
2. `useEffect` starts async initialization (WebSocket connecting...)
3. User clicks "Add Todo" BEFORE WebSocket sends `initialState` message
4. `updateMirrorState()` runs with `prevState = { todos: [] }` (the `initialValue`)
5. Writes `{ todos: [newTodo] }` to file, overwriting existing `{ todos: [todo1, todo2, ...] }`
6. WebSocket `initialState` arrives too late - file already corrupted

Solution: use `virtual:mirrorstate/initial-states` synchronously. File content is source of truth, optional `initialValue` creates file if it's missing.
The new API will support `useMirrorState<T>("name")` and `useMirrorState<T>("name", defaultValue)`.

- [x] `packages/react-mirrorstate/src/index.ts` - update main hook @done(2025-10-14)
  - [x] add import at top: `import { INITIAL_STATES } from "virtual:mirrorstate/initial-states";` @done(2025-10-14)
  - [x] change function signature: make `initialValue` parameter optional (`initialValue?: T`) @done(2025-10-14)
  - [x] update `useState` initialization: @done(2025-10-14)
    - [x] change to: `const [state, setState] = useState<T | undefined>(() => INITIAL_STATES?.[name] as T | undefined ?? initialValue);` @done(2025-10-14)
    - [x] use function form to ensure synchronous evaluation @done(2025-10-14)
  - [x] remove `isInitialized` state variable @done(2025-10-14)
  - [x] simplify `useEffect` @done(2025-10-14)
    - [x] remove all `isInitialized` tracking and `setIsInitialized` calls @done(2025-10-14)
    - [x] remove initialization timeout logic (lines 26-31) @done(2025-10-14)
    - [x] remove `isInitialized` from dependency array @done(2025-10-14)
    - [x] remove `connectionManager.isInitialized()` check (lines 18-24) @done(2025-10-14)
    - [x] keep only: `connectionManager.subscribe()` call and cleanup @done(2025-10-14)
  - [x] add file creation logic in `useEffect`: @done(2025-10-14)
    - [x] check if file doesn't exist: `INITIAL_STATES?.[name] === undefined` @done(2025-10-14)
    - [x] and if `initialValue` was provided @done(2025-10-14)
    - [x] call `connectionManager.updateState(name, initialValue)` to create file @done(2025-10-14)
    - [x] use a ref to track if we've done this once (prevent duplicate writes on re-renders) @done(2025-10-14)
  - [x] update return type signature: `[T | undefined, typeof updateMirrorState]` to reflect optional state @done(2025-10-14)
- [x] `packages/react-mirrorstate/src/connection-manager.ts` - remove async initialization infrastructure @done(2025-10-14)
  - [x] remove `getInlinedInitialStates()` method (lines 91-100) @done(2025-10-14)
  - [x] remove `loadInitialStateFromInline()` method (lines 102-115) @done(2025-10-14)
  - [x] remove `initialized` Set property declaration (line 12) @done(2025-10-14)
  - [x] remove all `initialized.add()` calls (lines 75, 109) @done(2025-10-14)
  - [x] remove `isInitialized()` method (lines 187-189) @done(2025-10-14)
  - [x] simplify `subscribe()` method (lines 117-147): @done(2025-10-14)
    - [x] keep listener registration logic @done(2025-10-14)
    - [x] keep immediate notification if `currentStates.has(name)` @done(2025-10-14)
    - [x] remove `loadInitialStateFromInline()` call and `.then()` promise logic (lines 131-137) @done(2025-10-14)
    - [x] keep `connect()` call @done(2025-10-14)
  - [x] keep `currentStates` Map - still needed for tracking WebSocket updates @done(2025-10-14)
  - [x] keep `getCurrentState()` method - may still be useful @done(2025-10-14)
- [x] add type declarations for virtual module @done(2025-10-14)
  - [x] create or update `packages/react-mirrorstate/src/virtual.d.ts`: @done(2025-10-14)
    ```typescript
    declare module "virtual:mirrorstate/initial-states" {
      export const INITIAL_STATES: Record<string, any> | undefined;
    }
    ```
  - [x] ensure `virtual.d.ts` is included in `tsconfig.json` or as a sibling to source files @done(2025-10-14)
- [x] `packages/vite-plugin-mirrorstate/src/index.ts` - add HMR for virtual module (optional but recommended) @done(2025-10-14)
  - [x] in watcher `change` handler (around line 58), after broadcasting WebSocket message: @done(2025-10-14)
    - [x] get virtual module from module graph: `const mod = server.moduleGraph.getModuleById('virtual:mirrorstate/initial-states');` @done(2025-10-14)
    - [x] invalidate it: `if (mod) { server.moduleGraph.invalidateModule(mod); }` @done(2025-10-14)
- [x] update examples code @done(2025-10-14)
- [x] update README @done(2025-10-14)
- [x] version bump the package @done(2025-10-14)

## Feature: Automatic State Update Batching

Similar to React 18's automatic batching, multiple `updateMirrorState` calls within the same synchronous execution context are now batched together to minimize re-renders and WebSocket messages.

- [x] implement batching queue mechanism in `packages/react-mirrorstate/src/index.ts` @done(2025-11-05)
  - [x] add batch queues to collect multiple updaters @done(2025-11-05)
  - [x] use `queueMicrotask` to flush batch at end of synchronous execution @done(2025-11-05)
  - [x] apply all queued updates sequentially using immer's `produce` @done(2025-11-05)
  - [x] notify all React components with single setState call @done(2025-11-05)
- [x] fix `connection-manager.ts` to immediately update `currentStates` @done(2025-11-05)
  - [x] move `currentStates.set()` before debounce timeout @done(2025-11-05)
  - [x] ensures subsequent batched updates can access latest state @done(2025-11-05)

Benefits:

- Multiple rapid updates result in single re-render instead of multiple
- WebSocket messages are still debounced at 10ms (unchanged)
- Better performance for rapid state changes (e.g., button spam)
