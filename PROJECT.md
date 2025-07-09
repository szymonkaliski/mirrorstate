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

## Feature: Project Scaffold

- [ ] set up `git` repo
- [ ] set up directories for:
  - [ ] Vite plugin
  - [ ] React library
  - [ ] an examples directory - scaffold projects with minimal React + Vite code, don't use `create-react-app` etc.
- [ ] set up basic Vite and React code together with a simple counter example (where the count is persisted in MirrorState)


