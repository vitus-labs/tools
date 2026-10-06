---
'@vitus-labs/tools-vitest': patch
'@vitus-labs/tools-nextjs': minor
'@vitus-labs/tools-typescript': patch
---

Config preset fixes.

- vitest: resolve `aliases` against the Vite project root (new optional `root` option) instead of `process.cwd()`, so they work with `test.projects`; declare optional peer `@vitest/coverage-v8`; widen `vite` peer to `^6 || ^7 || ^8`; correct `pool`/`css` docs; `types` export condition first plus `default`.
- nextjs: `headers` record now matches keys case-insensitively, appends unknown headers and removes defaults set to `false`/`null`; `withVitusLabs` accepts a config function; README uses `cacheComponents`; `types` export condition first plus `default`.
- typescript: presets no longer declare `include`/`exclude` (they resolved inside `node_modules` for consumers) - set them in your own tsconfig; README peer range corrected.
