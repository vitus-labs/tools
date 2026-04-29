---
'@vitus-labs/tools-typescript': minor
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-mcp': patch
---

Switch shared `@vitus-labs/tools-typescript/lib` tsconfig to `module: "NodeNext"` + `moduleResolution: "NodeNext"` + `rewriteRelativeImportExtensions: true`.

**Why**: The previous `Bundler` resolution was permissive about extensions. As a result, packages could ship source with extensionless relative imports (or just stale `.js` references) that built and typechecked cleanly but failed at runtime under Node's strict ESM resolver. This bit `@vitus-labs/tools-nextjs-images` (had to be pinned to 1.7.0 by a consumer) and `@vitus-labs/tools-nextjs`. Under NodeNext, missing extensions are a compile error — the bug class is now caught at build time instead of at the consumer's runtime.

**Source convention is now `.ts`/`.tsx` extensions**: `import x from './foo.ts'` in source, which TS rewrites to `./foo.js` at emit. This is the modern TS-ESM pattern (TS 5.7+). The previous `.js`-in-source convention still works — `rewriteRelativeImportExtensions` only rewrites `.ts`/`.tsx`, leaving `.js` untouched.

**Internal**: CJS rollup plugins (`rollup-plugin-filesize`, `rollup-plugin-typescript2`, `@rollup/plugin-replace`, `@rollup/plugin-terser`) are now loaded via `createRequire` to avoid CJS/ESM default-import friction under stricter NodeNext type-checking. Same runtime, cleaner type inference.

**Consumer migration** (if extending `@vitus-labs/tools-typescript/lib`): no action required if your source already uses `.js` extensions on relative imports. If you have extensionless relative imports, TS will now error and tell you the correct fix.
