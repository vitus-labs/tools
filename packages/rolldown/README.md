# @vitus-labs/tools-rolldown

[Rolldown](https://rolldown.rs)-powered build tool for TypeScript libraries.

A fast, Rust-based alternative to `@vitus-labs/tools-rollup`.

## Installation

```bash
bun add -d @vitus-labs/tools-rolldown
```

## Usage

Add to your `package.json`:

```json
{
  "scripts": {
    "build": "vl_rolldown_build",
    "dev": "vl_rolldown_build-watch"
  }
}
```

## How it works

The build tool reads your `package.json` to determine what output bundles to produce:

| `package.json` field | Format | Platform |
|---|---|---|
| `exports.import` | ESM | universal |
| `exports.require` | CJS | universal |
| `main` | CJS or ESM | universal |
| `module` | ESM | universal |
| `browser` | same as source | browser |
| `react-native` | ESM | native |
| `umd:main` | UMD | — |
| `unpkg` | UMD (minified) | — |

TypeScript declarations are generated automatically when `exports.types` (or `types`/`typings`) is set.

### Platform globals

These constants are injected at build time based on the output platform:

| Constant | Description |
|---|---|
| `__VERSION__` | Package version from `package.json` |
| `__BROWSER__` | `true` for browser builds |
| `__NODE__` | `true` for node builds |
| `__WEB__` | `true` for node + browser + universal |
| `__NATIVE__` | `true` for React Native builds |
| `__CLIENT__` | `true` for browser + native |

Add type declarations to your project:

```json
{
  "compilerOptions": {
    "types": ["@vitus-labs/tools-rolldown/global"]
  }
}
```

## Configuration

Configure via `vl-tools.config.mjs` (key: `build`):

```js
export default {
  build: {
    sourceDir: 'src',
    outputDir: 'lib',
    typescript: true,
    esModulesOnly: false,
    replaceGlobals: true,
    external: ['react/jsx-runtime'],
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
  },
}
```

## License

MIT
