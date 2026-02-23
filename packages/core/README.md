# @vitus-labs/tools-core

Shared utilities for config loading, package metadata, and file discovery.

This is the foundation package used by all other `@vitus-labs/tools-*` packages.

## Installation

```bash
bun add @vitus-labs/tools-core
```

## API

### `defineConfig(config)`

Identity helper for typed config files:

```js
// vl-tools.config.mjs
import { defineConfig } from '@vitus-labs/tools-core'

export default defineConfig({
  build: { sourceDir: 'src', outputDir: 'lib' },
  stories: { framework: 'next' },
})
```

### `PKG`

Parsed `package.json` of the consuming project, augmented with:

- `bundleName` — camelCase package name (e.g. `@my-org/my-lib` → `myOrgMyLib`)
- `externalDependencies` — merged `dependencies` + `peerDependencies` keys

### `VL_CONFIG`

Loaded config from `vl-tools.config.mjs`. Returns a function to access config sections:

```ts
const buildConfig = VL_CONFIG('build')
buildConfig.get('sourceDir', 'src') // read with default
buildConfig.merge({ outputDir: 'dist' }) // deep-merge
```

Config files cascade: root configs load first, closest package config overrides.

### `TS_CONFIG`

Parsed `tsconfig.json` of the consuming project.

### `findFile(filename)`

Walks up the directory tree from `cwd` to find a file by name.

### `loadFileToJSON(filename)`

Finds and parses a JSON file from the directory tree.

### `loadConfigParam(filename)`

Returns a function `(key, defaultValue)` to read dot-path keys from a JSON config file.

### `swapGlobals(globals)`

Inverts key/value pairs — used to convert rollup `globals` format.

## Note

`PKG`, `VL_CONFIG`, and `TS_CONFIG` are computed at module load time using top-level `await`. Importing this package has side effects (reads `package.json`, `tsconfig.json`, and `vl-tools.config.mjs` from `cwd`).

## License

MIT
