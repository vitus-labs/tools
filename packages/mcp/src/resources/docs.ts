import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

interface PackageDoc {
  name: string
  description: string
  content: string
}

const PACKAGES: PackageDoc[] = [
  {
    name: 'core',
    description:
      'Shared utilities for config loading, package metadata, and file discovery',
    content: `# @vitus-labs/tools-core

Shared utilities for config loading, package metadata, and file discovery.
Foundation package used by all other @vitus-labs/tools-* packages.

## Installation
\`\`\`bash
bun add @vitus-labs/tools-core
\`\`\`

## API

### defineConfig(config)
Identity helper for typed config files:
\`\`\`js
// vl-tools.config.mjs
import { defineConfig } from '@vitus-labs/tools-core'
export default defineConfig({
  build: { sourceDir: 'src', outputDir: 'lib' },
})
\`\`\`

### PKG
Parsed package.json with computed properties:
- bundleName — camelCase package name
- externalDependencies — merged dependencies + peerDependencies

### VL_CONFIG
Config from vl-tools.config.mjs:
\`\`\`ts
const buildConfig = VL_CONFIG('build')
buildConfig.get('sourceDir', 'src')
buildConfig.merge({ outputDir: 'dist' })
\`\`\`

### TS_CONFIG
Parsed tsconfig.json.

### findFile(filename)
Walks up directory tree to find a file.

### loadFileToJSON(filename)
Finds and parses a JSON file.

### swapGlobals(globals)
Inverts key/value pairs for rollup globals format.

Note: PKG, VL_CONFIG, TS_CONFIG use top-level await (side effects at import time).`,
  },
  {
    name: 'typescript',
    description: 'Shared TypeScript configuration presets (lib + nextjs)',
    content: `# @vitus-labs/tools-typescript

Shared TypeScript configuration presets. Peer dep: typescript >= 5.

## Presets

### lib — for libraries
\`\`\`json
{ "extends": "@vitus-labs/tools-typescript/lib" }
\`\`\`
Settings: target ES2024, module Preserve, moduleResolution Bundler, strict, noUncheckedIndexedAccess, jsx react-jsx, declaration + declarationMap + sourceMap, verbatimModuleSyntax.

### nextjs — for Next.js apps
\`\`\`json
{ "extends": "@vitus-labs/tools-typescript/nextjs" }
\`\`\`
Settings: target ES2024, module ESNext, jsx preserve, incremental.`,
  },
  {
    name: 'lint',
    description: 'Shared Biome configuration for formatting and linting',
    content: `# @vitus-labs/tools-lint

Shared Biome configuration.

## Usage
\`\`\`json
{
  "$schema": "https://biomejs.dev/schemas/2.4.7/schema.json",
  "extends": ["@vitus-labs/tools-lint/biome"]
}
\`\`\`

## Formatting
2 spaces, single quotes, no semicolons, trailing commas, LF, JSX double quotes, line width 80.

## Linting
Biome recommended + noUnusedVariables/noUnusedImports (error), useHookAtTopLevel (error), noExplicitAny (off), noConsole (warn), noShadow (warn).

## Globals
Pre-declared: __BROWSER__, __NATIVE__, __NODE__, __WEB__, __CLIENT__, __VERSION__, __VITUS_LABS_STORIES__.`,
  },
  {
    name: 'vitest',
    description: 'Shared Vitest configuration with coverage thresholds',
    content: `# @vitus-labs/tools-vitest

Shared Vitest configuration. Peer dep: vitest >= 4.

## Usage
\`\`\`ts
import { createVitestConfig } from '@vitus-labs/tools-vitest'
export default createVitestConfig()
\`\`\`

## Options
| Option | Default | Description |
|---|---|---|
| environment | 'node' | Test environment |
| css | false | Enable CSS processing |
| setupFiles | — | Setup files |
| aliases | — | Path aliases |
| plugins | — | Vite plugins |
| testTimeout | 5000 | Timeout ms |
| pool | 'threads' | Worker pool |
| include | — | Extra test patterns |
| exclude | — | Extra exclude patterns |
| coverageExclude | — | Extra coverage excludes |
| coverageThresholds | 90% all | Override thresholds |

## Defaults
Node environment, globals enabled, mock reset, V8 coverage, 90% thresholds.`,
  },
  {
    name: 'rolldown',
    description:
      'Rolldown-powered build tool for TypeScript libraries (Rust-based)',
    content: `# @vitus-labs/tools-rolldown

Fast Rust-based build tool for TypeScript libraries.

## Usage
\`\`\`json
{ "scripts": { "build": "vl_rolldown_build", "dev": "vl_rolldown_build-watch" } }
\`\`\`

## How it works
Reads package.json fields to determine output:
- exports.import → ESM, exports.require → CJS
- main → CJS/ESM, module → ESM, browser → browser, react-native → native
- umd:main → UMD, unpkg → UMD minified
- exports.types/types/typings → .d.ts declarations

## Platform globals (injected at build time)
__VERSION__, __BROWSER__, __NODE__, __WEB__, __NATIVE__, __CLIENT__

## Configuration (vl-tools.config.mjs, key: build)
\`\`\`js
export default {
  build: {
    sourceDir: 'src', outputDir: 'lib', typescript: true,
    esModulesOnly: false, replaceGlobals: true,
    external: ['react/jsx-runtime'],
    globals: { react: 'React' },
  },
}
\`\`\`

## Advanced build options
For non-library builds (Chrome extensions, CLI tools, Lambda, Electron):
- entries: explicit input/output pairs with format (es/cjs/umd/iife), skips package.json detection
- bundleAll: true — bundle all deps, no externals
- copyFiles: [{ from, to }] — copy static assets post-build
- banner/footer: inject text (e.g. shebang) at top/bottom of output
- alias: { '@': './src' } — resolve aliases
- plugins: custom rolldown plugins appended to built-ins

\`\`\`js
export default {
  build: {
    entries: [
      { input: 'src/background.ts', file: 'dist/background.js', format: 'iife', env: 'production' },
      { input: 'src/popup.ts', file: 'dist/popup.js', format: 'es' },
    ],
    bundleAll: true,
    copyFiles: [{ from: 'src/manifest.json', to: 'dist/manifest.json' }],
    banner: '#!/usr/bin/env node',
    typescript: false,
  },
}
\`\`\``,
  },
  {
    name: 'rollup',
    description:
      'Rollup-powered build tool with DTS bundling via API Extractor',
    content: `# @vitus-labs/tools-rollup

Rollup-powered build tool with TypeScript declaration bundling via API Extractor.

## Usage
\`\`\`json
{ "scripts": { "build": "vl_build", "dev": "vl_build-watch" } }
\`\`\`

Same output format detection and platform globals as @vitus-labs/tools-rolldown.
Same configuration via vl-tools.config.mjs (key: build).`,
  },
  {
    name: 'nextjs',
    description: 'Opinionated Next.js config wrapper with security headers',
    content: `# @vitus-labs/tools-nextjs

Next.js configuration wrapper. Peer dep: next >= 14.

## Usage
\`\`\`ts
import { withVitusLabs } from '@vitus-labs/tools-nextjs'
export default withVitusLabs({})
\`\`\`

## Configuration (vl-tools.config.mjs, key: next)
\`\`\`js
export default {
  next: {
    headers: true,
    images: { remotePatterns: [{ hostname: '*.example.com' }] },
    transpilePackages: ['@my-org/ui-core'],
    typescript: { ignoreBuildErrors: false },
  },
}
\`\`\`

## Security headers (default)
X-DNS-Prefetch-Control, Strict-Transport-Security (HSTS), X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy.

headers option accepts: true, false, object overrides, or callback.`,
  },
  {
    name: 'nextjs-images',
    description:
      'Image optimization loaders for Next.js (webp, lqip, responsive, svg sprites)',
    content: `# @vitus-labs/tools-nextjs-images

Image optimization loaders for Next.js with webpack. Peer dep: next >= 14.

## Usage
\`\`\`ts
import withOptimizedImages from '@vitus-labs/tools-nextjs-images'
export default withOptimizedImages()({})
\`\`\`

## Resource queries
\`\`\`ts
import image from './photo.jpg?webp'
import image from './photo.jpg?resize&sizes[]=300&sizes[]=600'
import { src, preSrc } from './photo.jpg?lqip'
import icon from './icon.svg?sprite'
\`\`\`

## Options
optimizeImages, optimizeImagesInDev, handleImages, imagesFolder, imagesName, inlineImageLimit, defaultImageLoader.

## Optional optimizers
imagemin-mozjpeg, imagemin-optipng, imagemin-pngquant, imagemin-gifsicle, imagemin-svgo, webp-loader.`,
  },
  {
    name: 'storybook',
    description:
      'Preconfigured Storybook 10 with auto-discovery and rocketstories',
    content: `# @vitus-labs/tools-storybook

Storybook 10 setup for React (Vite, Next.js, React Native).
Peer deps: react >= 19, react-dom >= 19.

## Usage
\`\`\`json
{ "scripts": { "stories": "vl_stories", "stories:build": "vl_stories-build" } }
\`\`\`

Config files:
\`\`\`ts
// .storybook/main.ts
export { default } from '@vitus-labs/tools-storybook/storybook/main'
// .storybook/preview.ts
export { default } from '@vitus-labs/tools-storybook/storybook/preview'
\`\`\`

## Features
- Auto-discovery (scans index.ts, generates virtual story modules)
- Rocketstories integration (dimension exports, pseudo-states)
- Frameworks: vite, next, react-native
- 15+ addons included (a11y, docs, dark-mode, pseudo-states, etc.)

## Configuration (vl-tools.config.mjs, key: stories)
framework, port, outDir, storiesDir, rocketstories, addons, globals, ui.`,
  },
  {
    name: 'favicon',
    description: 'CLI tool for generating multi-platform favicons',
    content: `# @vitus-labs/tools-favicon

CLI for generating favicons. Powered by the favicons package.

## Usage
\`\`\`json
{ "scripts": { "favicon": "vl_favicon" } }
\`\`\`

## Configuration (vl-tools.config.mjs, key: favicon)
\`\`\`js
export default {
  favicon: {
    background: '#fff', theme_color: '#fff',
    icons: [{ input: 'src/assets/logo.png', output: 'public/icons', path: '/icons' }],
  },
}
\`\`\`

Generates: Android, Apple icon, Apple startup, Coast, Favicons, Firefox, Windows, Yandex.`,
  },
  {
    name: 'atlas',
    description: 'Dependency graph visualizer and monorepo health analyzer',
    content: `# @vitus-labs/tools-atlas

Interactive dependency graph visualizer with ECharts (force, tree, matrix views).

## Usage
\`\`\`json
{ "scripts": { "atlas": "vl_atlas" } }
\`\`\`

## Analyses
Cycles, Impact, Depth, Bundle Size, Version Drift, Health Score, Change Frequency.

## Configuration (vl-tools.config.mjs, key: atlas)
workspaces, depTypes, include, exclude, outputPath, open, title, report ('markdown'|'json'|false).

## Programmatic API
\`\`\`ts
import { generateAtlas } from '@vitus-labs/tools-atlas'
await generateAtlas({ workspaces: ['packages/*'], report: 'markdown' })
\`\`\``,
  },
]

const registerDocs = (server: McpServer) => {
  // Register overview resource
  server.registerResource(
    'docs://vitus-labs/overview',
    'docs://vitus-labs/overview',
    {
      description: 'Overview of all @vitus-labs/tools packages',
      mimeType: 'text/markdown',
    },
    async () => {
      const overview = [
        '# @vitus-labs/tools',
        '',
        'Pre-configured tooling for JavaScript and TypeScript library development.',
        '',
        '## Packages',
        '',
        '| Package | Description |',
        '|---|---|',
        ...PACKAGES.map(
          (p) => `| @vitus-labs/tools-${p.name} | ${p.description} |`,
        ),
        '',
        '## Quick Start',
        '',
        '```bash',
        'bun add -d @vitus-labs/tools-typescript @vitus-labs/tools-lint @vitus-labs/tools-vitest @vitus-labs/tools-rolldown',
        '```',
        '',
        'Or use the scaffold_package tool to generate a complete project.',
        '',
        'Read individual package docs: docs://vitus-labs/packages/{name}',
      ]
      return {
        contents: [
          {
            uri: 'docs://vitus-labs/overview',
            text: overview.join('\n'),
            mimeType: 'text/markdown',
          },
        ],
      }
    },
  )

  // Register each package doc
  for (const pkg of PACKAGES) {
    const uri = `docs://vitus-labs/packages/${pkg.name}`
    server.registerResource(
      uri,
      uri,
      {
        description: `Documentation for @vitus-labs/tools-${pkg.name}: ${pkg.description}`,
        mimeType: 'text/markdown',
      },
      async () => ({
        contents: [{ uri, text: pkg.content, mimeType: 'text/markdown' }],
      }),
    )
  }
}

export { registerDocs }
