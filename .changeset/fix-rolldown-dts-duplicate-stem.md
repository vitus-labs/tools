---
'@vitus-labs/tools-rolldown': patch
---

Fix `ENOENT` crash in grouped DTS for packages with two subpath exports pointing at the same `types` path (e.g. `./jsx-runtime` and `./jsx-dev-runtime` sharing one implementation — common in JSX runtime compat layers).

**The bug.** `buildDtsGrouped` dedup'd the rolldown `input` map by stem but pushed the same stem twice into `entryStems`. `promoteEntries` iterated `entryStems`, calling `pickRealDtsFor(stem, tempFiles, …)` against a snapshot of `tempFiles` it never refreshes. Iteration 1 renamed `<stem>2.d.ts` out of the temp dir; iteration 2's `pickRealDtsFor` still saw it in the stale snapshot and `statSync`'d → `ENOENT`. Build crashed; consumers like `@pyreon/preact-compat` (5 compat packages) could not build.

**Fix (root cause).** `entryStems` now dedups the same way `inputMap` does — `if (!entryStems.includes(stem)) entryStems.push(stem)`.

**Fix (belt-and-suspenders).** `pickRealDtsFor` now skips files that no longer exist via `existsSync` before `statSync`. Defends against any future overlap in candidate sets even with the stem-dedup in place.

**Regression-lock.** New `build.dup-stem.integration.test.ts` + permanent fixture `test-fixtures/dup-stem/` that mirrors the @pyreon/preact-compat shape (two subpaths → same types path). **Proven**: temporarily removing the dedup fails the test with the exact ENOENT shape; removing only the `existsSync` guard keeps the test green (dedup alone is sufficient — guard is genuine defense in depth).

Test asserts:
- Build completes (no ENOENT)
- Exactly one `.d.ts` at the dup stem, no leftover `<stem>N.d.ts` artifacts
- File contains real declarations (not the plugin's `export { }` stub)
- Strict `tsc --skipLibCheck=false` typecheck passes against the produced lib

Why 2.6.1 tests missed it: existing DTS integration fixtures don't have two subpaths pointing at the same `types` path. The dup-stem fixture covers that shape explicitly.
