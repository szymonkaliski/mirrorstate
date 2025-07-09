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

## Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the packages:
   ```bash
   npm run build
   ```

3. Run the examples:
   ```bash
   npm run examples
   ```

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

## Feature: Better Logs

- [ ] add timestamps and colors to logs

## Feature: Implementation Review

- [ ] review constants used in code - we seem to rely on `localhost` and specific websocket port, can we follow more of Vite approach with configuration, auto-finding ports, etc?
- [ ] review anything else and think hard what did we miss here?

