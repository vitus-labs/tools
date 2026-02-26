# @vitus-labs/tools-storybook

Preconfigured [Storybook 10](https://storybook.js.org) setup for React projects with Vite or Next.js.

Includes auto-discovery of components, rocketstories integration, and curated addon presets.

## Installation

```bash
bun add -d @vitus-labs/tools-storybook
```

**Peer dependencies:** `react >= 19`, `react-dom >= 19`

## Usage

### CLI commands

Add to your `package.json`:

```json
{
  "scripts": {
    "stories": "vl_stories",
    "stories:build": "vl_stories-build"
  }
}
```

For monorepos:

```json
{
  "scripts": {
    "stories": "vl_stories-monorepo",
    "stories:build": "vl_stories-monorepo-build"
  }
}
```

### Storybook config files

Create a `.storybook/` directory with these files:

```ts
// .storybook/main.ts
export { default } from '@vitus-labs/tools-storybook/storybook/main'
```

```ts
// .storybook/preview.ts
export { default } from '@vitus-labs/tools-storybook/storybook/preview'
```

```ts
// .storybook/manager.ts
export { default } from '@vitus-labs/tools-storybook/storybook/manager'
```

## Features

### Auto-discovery

Components are automatically discovered and turned into stories without writing manual `.stories.tsx` files. The indexer scans for `index.ts` component files and generates virtual story modules.

- **Rocketstyle components** get stories with dimension exports (states, sizes, variants) and pseudo-state rendering
- **Plain React components** get a basic story with title and default render

### Rocketstories integration

The Vite plugin generates story imports from a configurable rocketstories module. This allows auto-discovered stories to use your project's `init()` factory with decorators (ThemeProvider, etc.).

### Frameworks

- `vite` — uses `@storybook/react-vite` (default)
- `next` — uses `@storybook/nextjs-vite` with `next/font` mocking

### Included addons

a11y, chromatic, designs, docs, dark-mode, pseudo-states, themes, vitest, viewport, controls, actions, measure, outline, toolbars, backgrounds

## Configuration

Configure via `vl-tools.config.mjs` (key: `stories`):

```js
export default {
  stories: {
    framework: 'next',
    port: 6006,
    outDir: '/docs',
    storiesDir: ['/src/**/*.stories.@(js|jsx|ts|tsx|md|mdx)'],
    rocketstories: {
      module: '@my-org/rocketstories',
      export: 'storyOf',
    },
    addons: {
      docs: true,
      a11y: true,
      chromatic: true,
      themes: true,
      vitest: true,
    },
    globals: {},
    ui: { theme: 'dark' },
  },
}
```

### `rocketstories`

| Option | Default | Description |
|---|---|---|
| `module` | `@vitus-labs/rocketstories` | The npm module to import rocketstories from |
| `export` | `rocketstories` | The named export to use from the module |

This controls what auto-discovered stories import. When your rocketstories wrapper uses `init({ decorators: [ThemeProvider] })`, auto-discovered stories automatically get your decorators.

## Exports

| Export | Description |
|---|---|
| `@vitus-labs/tools-storybook` | Config utilities (`CONFIG`, types) |
| `@vitus-labs/tools-storybook/storybook/main` | Storybook main config |
| `@vitus-labs/tools-storybook/storybook/preview` | Storybook preview config |
| `@vitus-labs/tools-storybook/storybook/manager` | Storybook manager config |

## License

MIT
