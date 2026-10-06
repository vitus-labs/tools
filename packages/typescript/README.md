# @vitus-labs/tools-typescript

Shared TypeScript configuration presets.

## Installation

```bash
bun add -d @vitus-labs/tools-typescript
```

**Peer dependency:** `typescript` 6.x or 7.x

## Presets

The presets deliberately do **not** set `include` / `exclude`. TypeScript resolves
those paths relative to the config file that declares them, so a preset's
`include` would point inside `node_modules`. Always set them in your own
`tsconfig.json`, e.g. `"include": ["src"]` and `"exclude": ["node_modules", "lib"]`
(for Next.js: `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]`).

### `lib` — for libraries

Strict TypeScript config targeting ES2024 with bundler module resolution.

```json
{
  "extends": "@vitus-labs/tools-typescript/lib",
  "include": ["src"]
}
```

Key settings:
- `target: ES2024`, `module: Preserve`, `moduleResolution: Bundler`
- `strict: true`, `noUncheckedIndexedAccess: true`
- `jsx: react-jsx`
- `declaration: true`, `declarationMap: true`, `sourceMap: true`
- `verbatimModuleSyntax: true`
- `types: ["node"]` — override with `"types": []` (or your own list) for browser-only libraries without `@types/node`

### `node` — for Node.js packages

```json
{
  "extends": "@vitus-labs/tools-typescript/node",
  "include": ["src"]
}
```

Key settings: `module`/`moduleResolution: NodeNext`, `rewriteRelativeImportExtensions: true`, `types: ["node"]`, `strict: true`.

### `nextjs` — for Next.js applications

```json
{
  "extends": "@vitus-labs/tools-typescript/nextjs",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Key settings:
- `target: ES2024`, `module: ESNext`, `moduleResolution: Bundler`
- `strict: true`, `noUncheckedIndexedAccess: true`
- `jsx: preserve` (Next.js handles the JSX transform)
- `incremental: true`

## License

MIT
