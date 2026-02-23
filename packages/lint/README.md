# @vitus-labs/tools-lint

Shared [Biome](https://biomejs.dev) configuration for formatting and linting.

## Installation

```bash
bun add -d @vitus-labs/tools-lint
```

## Usage

Create a `biome.json` in your project root:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "extends": ["@vitus-labs/tools-lint/biome"]
}
```

## What's included

### Formatting

- 2 spaces, single quotes, no semicolons
- Trailing commas, LF line endings
- JSX uses double quotes
- Line width: 80

### Linting

Biome recommended rules plus:

- `noUnusedVariables` / `noUnusedImports` — error
- `useHookAtTopLevel` — error
- `noExplicitAny` — off
- `noConsole` — warn
- `noShadow` — warn

### Global variables

Pre-declared so the linter doesn't flag them: `__BROWSER__`, `__NATIVE__`, `__NODE__`, `__WEB__`, `__CLIENT__`, `__VERSION__`, `__VITUS_LABS_STORIES__`.

## License

MIT
