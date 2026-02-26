# @vitus-labs/tools

Pre-configured tooling for JavaScript and TypeScript library development.

A monorepo of shared configs and build tools used across [Vitus Labs](https://github.com/vitus-labs) projects. Each package is published independently to npm and can be used standalone.

## Packages

| Package | Description |
|---|---|
| [`@vitus-labs/tools-core`](packages/core) | Shared utilities for config loading, package metadata, and path resolution |
| [`@vitus-labs/tools-typescript`](packages/typescript) | Shared TypeScript configuration (strict, ES2024, Bundler resolution) |
| [`@vitus-labs/tools-lint`](packages/lint) | Shared [Biome](https://biomejs.dev) configuration for formatting and linting |
| [`@vitus-labs/tools-rollup`](packages/rollup) | Build tooling powered by [Rollup](https://rollupjs.org) with TypeScript, DTS bundling, and multi-platform output |
| [`@vitus-labs/tools-rolldown`](packages/rolldown) | Build tooling powered by [Rolldown](https://rolldown.rs) — faster Rust-based alternative with built-in TS support |
| [`@vitus-labs/tools-vitest`](packages/vitest) | Shared [Vitest](https://vitest.dev) configuration with coverage thresholds and sensible defaults |
| [`@vitus-labs/tools-storybook`](packages/storybook) | Preconfigured [Storybook 10](https://storybook.js.org) with auto-discovery and rocketstories integration |
| [`@vitus-labs/tools-nextjs`](packages/nextjs) | Opinionated [Next.js](https://nextjs.org) config wrapper with security headers and sensible defaults |
| [`@vitus-labs/tools-nextjs-images`](packages/nextjs-images) | Image optimization loaders for Next.js with webpack (webp, lqip, responsive, svg sprites) |
| [`@vitus-labs/tools-atlas`](packages/atlas) | Dependency graph visualizer and monorepo health analyzer with ECharts and AI-readable reports |
| [`@vitus-labs/tools-favicon`](packages/favicon) | CLI tool for generating favicons from a source image |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 22
- [Bun](https://bun.sh) (package manager)

### Installation

```bash
bun install
```

### Scripts

```bash
# Build all packages
bun run pkgs:build

# Run tests
bun test

# Typecheck all packages
bun run typecheck

# Format code
bun run format

# Lint code
bun run lint

# Publish a release (from main)
bun run release

# Clean install
bun run pkgs:clean
```

## Usage

### TypeScript

```json
{
  "extends": "@vitus-labs/tools-typescript/lib"
}
```

### Biome (Lint + Format)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.4/schema.json",
  "extends": ["@vitus-labs/tools-lint/biome"]
}
```

### Rollup / Rolldown

Add the CLI commands to your package's `scripts`:

```json
{
  "scripts": {
    "build": "vl_build",
    "dev": "vl_build-watch"
  }
}
```

Or with Rolldown:

```json
{
  "scripts": {
    "build": "vl_rolldown_build",
    "dev": "vl_rolldown_build-watch"
  }
}
```

Both tools read configuration from `vl-tools.config.mjs` (key: `build`) and support the same config-merging pattern via `@vitus-labs/tools-core`.

### Vitest

```ts
// vitest.config.ts
import { createVitestConfig } from '@vitus-labs/tools-vitest'

export default createVitestConfig()
```

### Next.js

```ts
// next.config.ts
import { withVitusLabs } from '@vitus-labs/tools-nextjs'

export default withVitusLabs({
  // standard next.config.ts options still work
  experimental: { ppr: true },
})
```

Configure via `vl-tools.config.mjs` (key: `next`) for security headers, image optimization, and transpilePackages.

### Storybook

Add CLI commands to your `scripts`:

```json
{
  "scripts": {
    "stories": "vl_stories",
    "stories:build": "vl_stories-build"
  }
}
```

Use the pre-built Storybook config in `.storybook/main.ts`:

```ts
export { default } from '@vitus-labs/tools-storybook/storybook/main'
```

Configure via `vl-tools.config.mjs` (key: `stories`):

```js
export default {
  stories: {
    framework: 'next',
    rocketstories: {
      module: '@my-org/rocketstories',
      export: 'storyOf',
    },
  },
}
```

## Versioning

This monorepo uses [Lerna](https://lerna.js.org) with fixed versioning — all packages share the same version number.

- **Stable releases** are published from `main`
- **Prerelease versions** (`alpha`, `beta`) can be published from `feature/*` and `release/*` branches

## License

[MIT](LICENSE)
