---
'@vitus-labs/tools-typescript': minor
---

Add a `node` tsconfig preset and revert `lib` back to `Bundler` resolution.

```json
// For libraries bundled by rolldown/rollup/etc — what most consumers want:
{ "extends": "@vitus-labs/tools-typescript/lib" }

// For server/CLI packages built with plain tsc and consumed as Node ESM:
{ "extends": "@vitus-labs/tools-typescript/node" }
```

**Why**: 2.2.0 (#119) over-corrected by switching `lib` to `NodeNext` to surface a runtime ESM bug in two packages. But `Bundler` is the TS team's recommended setting for code that goes through a bundler — which is most "library" use cases. The right architecture is two presets:

- **`lib` (Bundler, restored)** — for libraries that get bundled. Permissive about extensions because the bundler resolves them. Has DOM + jsx.
- **`node` (NodeNext + rewriteRelativeImportExtensions, new)** — for pure Node packages. Strict about extensions because Node's resolver is. No DOM, no jsx, no allowJs.

The `nextjs` preset is unchanged.

If your package is bundled before consumers see it, use `lib`. If it ships raw `.js` that Node loads directly (like every package in this monorepo), use `node` — the strictness catches the missing-extension bug class at build time.
