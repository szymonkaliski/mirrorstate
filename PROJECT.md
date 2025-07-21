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
