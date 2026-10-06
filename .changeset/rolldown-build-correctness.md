---
'@vitus-labs/tools-rolldown': patch
---

Fix several build-correctness bugs in `@vitus-labs/tools-rolldown`:

- Declaration generation now works for directory subpath exports (`./devtools` -> `src/devtools/index.ts`) and for a root `src/index.tsx` entry; previously it failed with `UNRESOLVED_ENTRY`.
- `browser` fields no longer crash the build: `"browser": { "fs": false }` and the string form are handled (only string-to-string mappings produce a browser build).
- Multi-entry shared-chunk builds keep the output extension from `package.json` (`.mjs` / `.cjs`) instead of always writing `.js`.
- Declaration chunks are written to `_dts_chunks/`, so generating types into the same directory as the JS output no longer deletes the JS `_chunks/`.
- A file referenced by several fields (e.g. `exports.import` and `module`) is built once instead of twice.
- The visualizer report for a bare `file: 'index.js'` is written to `analysis/` instead of the filesystem root.
- Wildcard subpath exports (`./features/*`) are skipped with a warning, and nested condition objects (`import: { types, default }`) are flattened.
- Removed the documented-but-unused `esModulesOnly`, `include`, `exclude` and `typesDir` options from the rolldown base config.
