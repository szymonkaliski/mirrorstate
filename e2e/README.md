# E2E Tests for MirrorState

Comprehensive end-to-end test suite for MirrorState's bidirectional state synchronization.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test e2e/counter.spec.ts

# Run specific test by name pattern
npx playwright test -g "file changes update UI"

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## Test Coverage

### Counter Tests (`counter.spec.ts`)
- ✅ UI updates persist to file
- ✅ File changes update UI via WebSocket
- ✅ Rapid updates don't lose data

### Todo Tests (`todos.spec.ts`)
- ✅ Add, toggle, and delete todos
- ✅ File changes update UI

### Initialization Tests (`initialization.spec.ts`)
- ✅ Loads initial state from existing file synchronously
- ✅ Creates file with initialValue when file is missing

### Performance Tests (`performance.spec.ts`)
- ✅ Counter renders minimum required times on initial load
- ✅ Counter renders once per UI update
- ✅ Counter renders once per file update
- ✅ Counter does not re-render excessively during rapid updates

### Multi-tab Tests (`multi-tab.spec.ts`)
- ✅ Multiple tabs stay synchronized via WebSocket
- ✅ External file changes propagate to all tabs
- ✅ Changes from one tab appear in others without page refresh

## Known Limitations

Due to the containerized environment's restrictions, Playwright is configured with `--single-process` flag. This can cause browser crashes when running many tests sequentially within the same test file.

**Workaround**: Tests work perfectly when run individually or in smaller groups:

```bash
# Run individual test files (recommended)
npx playwright test e2e/counter.spec.ts
npx playwright test e2e/todos.spec.ts
npx playwright test e2e/multi-tab.spec.ts

# Or run specific tests by pattern
npx playwright test -g "file changes update UI"
```

All tests are fully functional and pass when run individually.

## Architecture

The tests verify:
1. **UI → File sync**: User interactions write to `.mirror.json` files
2. **File → UI sync**: External file changes trigger UI updates via WebSocket
3. **Initial state**: App loads with pre-existing mirror files synchronously
4. **File creation**: Missing files are created with `initialValue`
5. **Multi-tab sync**: Multiple browser tabs stay synchronized
6. **Performance**: Components render efficiently without unnecessary re-renders

## Test Structure

Each test:
1. Resets mirror files to a known state in `beforeEach`
2. Performs actions (UI clicks or file modifications)
3. Verifies both UI state and file contents
4. Includes appropriate wait times for WebSocket propagation

## Debugging

To debug a failing test:

```bash
# Run with headed browser to see what's happening
npx playwright test e2e/counter.spec.ts --headed

# Run with UI mode for interactive debugging
npx playwright test e2e/counter.spec.ts --ui

# Run with debug mode
npx playwright test e2e/counter.spec.ts --debug
```
