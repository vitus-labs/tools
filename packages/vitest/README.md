# @vitus-labs/tools-vitest

Shared [Vitest](https://vitest.dev) configuration for consistent testing across projects.

## Installation

```bash
bun add -d @vitus-labs/tools-vitest
```

**Peer dependency:** `vitest >= 4`

## Usage

Create a `vitest.config.ts` in your package:

```ts
import { createVitestConfig } from '@vitus-labs/tools-vitest'

export default createVitestConfig()
```

### Options

Pass an options object to customize the config:

```ts
import { createVitestConfig } from '@vitus-labs/tools-vitest'

export default createVitestConfig({
  environment: 'jsdom',
  css: true,
  setupFiles: ['@testing-library/jest-dom/vitest'],
  aliases: { '~/': 'src/' },
  plugins: [myVitePlugin()],
  testTimeout: 10000,
  pool: 'forks',
  include: ['tests/**/*.test.ts'],
  exclude: ['tests/e2e/**'],
  coverageExclude: ['src/storybook/**'],
  coverageThresholds: { statements: 80, branches: 80 },
})
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `environment` | `string` | `'node'` | Test environment (`'node'`, `'jsdom'`, `'happy-dom'`, etc.) |
| `css` | `boolean` | `false` | Enable CSS processing — useful for jsdom/happy-dom |
| `setupFiles` | `string[]` | — | Setup files to run before each test |
| `aliases` | `Record<string, string>` | — | Path aliases (e.g. `{ '~/': 'src/' }`) |
| `plugins` | `PluginOption[]` | — | Vite plugins |
| `testTimeout` | `number` | `5000` | Test timeout in milliseconds |
| `pool` | `'threads' \| 'forks' \| 'vmThreads' \| 'vmForks'` | `'threads'` | Worker pool |
| `include` | `string[]` | — | Extra glob patterns for test discovery |
| `exclude` | `string[]` | — | Extra glob patterns to exclude from tests |
| `coverageExclude` | `string[]` | — | Extra glob patterns to exclude from coverage |
| `coverageThresholds` | `CoverageThresholds` | 90% all | Override default thresholds |

You can also pass a string array as shorthand for `coverageExclude`:

```ts
export default createVitestConfig(['src/storybook/**', 'src/bin/**'])
```

## What's included

- **Environment:** Node.js (configurable)
- **Globals:** enabled (`describe`, `it`, `expect` available without imports)
- **Mock reset:** automatic between tests
- **Test files:** `src/**/*.test.ts`, `src/**/*.test.tsx`
- **Coverage provider:** V8
- **Coverage thresholds:** 90% statements, branches, functions, and lines
- **Coverage excludes:** test files, index re-exports, bin scripts

## Workspace setup

For monorepos, create a `vitest.workspace.ts` at the root:

```ts
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/my-lib',
  'packages/my-app',
])
```

Each package references the shared config via its own `vitest.config.ts`.

## License

MIT
