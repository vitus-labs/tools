# @vitus-labs/tools-typescript

Shared TypeScript configuration presets.

## Installation

```bash
bun add -d @vitus-labs/tools-typescript
```

**Peer dependency:** `typescript >= 5`

## Presets

### `lib` — for libraries

Strict TypeScript config targeting ES2024 with bundler module resolution.

```json
{
  "extends": "@vitus-labs/tools-typescript/lib"
}
```

Key settings:
- `target: ES2024`, `module: Preserve`, `moduleResolution: Bundler`
- `strict: true`, `noUncheckedIndexedAccess: true`
- `jsx: react-jsx`
- `declaration: true`, `declarationMap: true`, `sourceMap: true`
- `verbatimModuleSyntax: true`
- Includes `src/`, excludes `node_modules`, `__stories__`, `lib`

### `nextjs` — for Next.js applications

```json
{
  "extends": "@vitus-labs/tools-typescript/nextjs"
}
```

Key settings:
- `target: ES2024`, `module: ESNext`, `moduleResolution: Bundler`
- `strict: true`, `noUncheckedIndexedAccess: true`
- `jsx: preserve` (Next.js handles the JSX transform)
- `incremental: true`
- Includes `next-env.d.ts`, `**/*.ts`, `**/*.tsx`

## License

MIT
