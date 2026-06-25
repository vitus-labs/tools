# Change Log

## 2.6.3

### Patch Changes

- [#163](https://github.com/vitus-labs/tools/pull/163) [`507f10d`](https://github.com/vitus-labs/tools/commit/507f10de8ed615d24c3afc1381ed108a38dbc207) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Make `node:*` externalization robust against per-package `external` overrides.

  **The gap.** `node:*` was added to `baseConfig.external` (a user-overridable default). But `deepMerge` replaces arrays wholesale — so any package that sets its own `external` in `vl-tools.config.mjs` (e.g. to add `echarts` subpaths) silently dropped the `/^node:/` default and started emitting `UNRESOLVED_IMPORT` warnings on every `node:fs`/`node:path`/etc. import again. Not cosmetic: it's a regression-prone class — any package overriding `external` for any reason re-opened it.

  **The fix.** `node:*` is a hard invariant — a `node:` import is never a real module a library could bundle. Moved it out of the overridable `baseConfig.external` into an `ALWAYS_EXTERNAL` constant in `rolldown/config.ts` that `resolveExternals` spreads in unconditionally, independent of `CONFIG.external`. A package's `external` override is still honored (their entries are added), but can no longer drop node-builtin externalization.

  Regression-locked with two unit tests (package overrides `external`; `external` empty) — both fail without the fix, pass with it. Verified end-to-end: full monorepo build emits 0 `node:*` UNRESOLVED_IMPORT warnings, and a probe package that overrides `external` keeps `node:fs` external.

  Note: the related SOURCEMAP_BROKEN-on-isolated-path concern was investigated and does **not** reproduce — both the isolated and grouped DTS paths share `createDtsConfig`, which already sets `dts({ sourcemap: false })`. A single-entry build emits 0 SOURCEMAP_BROKEN warnings. No change needed.

- Updated dependencies []:
  - @vitus-labs/tools-core@2.6.3

## 2.6.2

### Patch Changes

- [#161](https://github.com/vitus-labs/tools/pull/161) [`1d0897f`](https://github.com/vitus-labs/tools/commit/1d0897f75c6a7b9bd2d040e4c0f8fbcc7b1d7c0d) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Fix `ENOENT` crash in grouped DTS for packages with two subpath exports pointing at the same `types` path (e.g. `./jsx-runtime` and `./jsx-dev-runtime` sharing one implementation — common in JSX runtime compat layers).

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

- Updated dependencies []:
  - @vitus-labs/tools-core@2.6.2

## 2.6.1

### Patch Changes

- [#159](https://github.com/vitus-labs/tools/pull/159) [`d0b81aa`](https://github.com/vitus-labs/tools/commit/d0b81aac14caf23e68694ce7ed2ff88d91bb4e2a) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Fix a build-breaking regression introduced in 2.6.0 for multi-entry-package consumers.

  **The bug.** `repairStaleImports` (added in 2.6.0 as part of the grouped DTS pipeline) called `require('node:fs')` inside an ESM module. Node enforces strict ESM and throws `ReferenceError: require is not defined` at runtime; consumers using `node` to run the bin saw a hard build failure. Only multi-entry packages with ≥1 renamed entry during DTS promotion hit it — single-entry packages used a different code path.

  **The fix.** Drop the runtime `require()` and import `readFileSync`/`writeFileSync` from `node:fs` at the top of the file alongside the existing fs imports. Plain ESM that both Node and bun accept.

  **Why 2.6.0's tests missed it.** The existing integration tests ran the _source_ `.ts` bin via _bun_. Bun's runtime is lenient and silently accepts `require()` in ESM as a CJS leniency — masking the bug. Node enforces it strictly. **Added `build.compiled.integration.test.ts`** which runs the _compiled_ `lib/bin/run-build.js` via **both `node` and `bun`** against a multi-entry fixture. Verified that the new test fails with the exact `ReferenceError: require is not defined` when the bug is re-introduced and passes after the fix.

  **Also**: turned off the plugin's internal sourcemap (`dts({ sourcemap: false })`). DTS output already had `output.sourcemap: false` (declarations don't need maps), but the plugin's fake-js transform still emitted a `[SOURCEMAP_BROKEN]` warning during multi-entry builds because its internal map wasn't chained through. Off at both layers, no warning. DTS files universally don't have a sourcemap use case (no debugger steps through type declarations) — no opt-out exposed.

- Updated dependencies []:
  - @vitus-labs/tools-core@2.6.1

## 2.6.0

### Minor Changes

- [#151](https://github.com/vitus-labs/tools/pull/151) [`36a2374`](https://github.com/vitus-labs/tools/commit/36a2374e9b9f18d01b0310a6910d08d75f8c8481) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Generate declarations for all sub-entries in a single `rolldown()` call instead of one call per entry.

  Each per-entry call instantiates the slow `rolldown-plugin-dts:generate` (the TS compiler + plugin state) from scratch — that's the `[PLUGIN_TIMINGS]` warning rolldown itself surfaces. Doing it in one call amortizes that setup AND lets common imports (e.g. a shared `types.ts`) emit as a single `_chunks/*.d.ts` instead of being inlined into every entry's stub.

  **Measured on the repo's own DTS fixtures:**

  | Fixture                                                 | Before (per-entry) | After (single-pass) | Speedup   |
  | ------------------------------------------------------- | ------------------ | ------------------- | --------- |
  | `dts-pipeline` (3 entries, `.tsx` + `.ts`)              | 675ms              | 380ms               | **1.78×** |
  | `multi-entry-sharing` (3 entries, shared `sentinel.ts`) | 551ms              | 348ms               | **1.58×** |

  Scales further with entry count — the per-call plugin instantiation cost is the dominant overhead, now amortized.

  **Same architecture as PR [#139](https://github.com/vitus-labs/tools/issues/139)'s JS multi-entry fix**: partition DTS configs by output dir, run groups of ≥2 entries in one call, keep single-entry packages on the existing `buildDtsIsolated` path. The temp-dir / "find largest `.d.ts`" trick that handles the plugin's `<name>.d.ts` stub + `<name>2.d.ts` real pair is preserved, just batched across all entries.

  **Regression-locked** in the integration test: the build output is asserted to contain the `single-pass` log marker AND to NOT contain the per-entry timing lines for grouped entries. A silent fallback to the old path would fail the test.

### Patch Changes

- [#157](https://github.com/vitus-labs/tools/pull/157) [`8067cf2`](https://github.com/vitus-labs/tools/commit/8067cf222b6cec7d1b8e000ed382999a9e43e411) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Default-externalize Node builtins (`node:*` imports) in the base config.

  Without this, every package that imports `node:fs`, `node:path`, etc. — which is most of them — triggers an `[UNRESOLVED_IMPORT] Could not resolve 'node:fs'` warning on every build. Rolldown is treating them as external implicitly anyway (so output is correct), but the warnings are noise and obscure real unresolved imports.

  Single-line change in `packages/rolldown/src/config/baseConfig.ts` — adds `/^node:/` (a RegExp) to the default `external` list. `expandExternal` in `@vitus-labs/tools-core` passes RegExps through unchanged (proven shape; PR [#112](https://github.com/vitus-labs/tools/issues/112)), so this composes with the per-package string list with no per-package changes needed.

  Verified on this monorepo's own packages (atlas, mcp, favicon, rolldown, rollup all import `node:*`): **0 `UNRESOLVED_IMPORT` warnings during build**, builds produce identical output (the imports were already being externalized — only the warning is silenced).

  **Side note on the related `SOURCEMAP_BROKEN` fix that was proposed:** verified — it doesn't reproduce in our current code. The warning fires only when DTS sourcemap is enabled (`output.sourcemap: true`), and our DTS config hardcodes `sourcemap: false`. Adding an `onwarn` handler would be a defensive no-op. Skipped for now; can revisit if DTS sourcemap ever becomes configurable.

- [#156](https://github.com/vitus-labs/tools/pull/156) [`afa223f`](https://github.com/vitus-labs/tools/commit/afa223f7d3ac8f9b41f4f5b547acb2ab14c9e6e1) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Routine dep refresh + CI action bumps.

  **Notable**: rolldown 1.1.1 → 1.1.3, rolldown-plugin-dts 0.25.2 → 0.26.0 (verified — integration tests for single-pass DTS still green), rollup 4.61.1 → 4.62.2, @microsoft/api-extractor 7.58.8 → 7.58.9, storybook 10.4.4 → 10.4.6, vite 8.0.16 → 8.1.0, vitest 4.1.8 → 4.1.9, @types/node 25.9 → 26.0 (major; no consumer rewrite needed).

  **zod held at `~4.3.6`** (recurring): `--latest` again tried to bump to 4.4.x; still breaks `@modelcontextprotocol/sdk` 1.29.0's `AnySchema` type. SDK hasn't shipped zod-4.4-compatible types yet.

  **Storybook peer ranges restored to wide** (recurring): `react`/`react-dom` → `>=19`, `react-native` → `>=0.74`, `react-native-web` → `>=0.19`.

  **Biome held at `~2.4.16`** — 2.5.1 introduced breaking config-schema changes (`linter.rules.recommended` → `preset`, `nursery.noShadow` rule removed/relocated, root-mode default flipped). The `biome migrate` command applied a partial migration that produced a worse-broken config (1,658 lint errors due to expanded include scope). Pinning to 2.4.x for this PR; biome 2.5 migration is its own scoped change.

  **CI actions** (SHA-pinned): actions/cache v5.0.5 → **v6.0.0** (major), actions/checkout v6.0.3 → **v7.0.0** (major).

  Verified e2e: 579 tests pass, typecheck + lint clean, all 10 packages build, `bun audit --audit-level=critical` clean, zero leaked `__dts_tmp*` dirs.

- [#150](https://github.com/vitus-labs/tools/pull/150) [`028fef7`](https://github.com/vitus-labs/tools/commit/028fef7200973141fc47fc57bffc73db1855bcad) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Routine dep refresh + CI action bumps.

  **Notable runtime/dev**: rolldown 1.0.3 → 1.1.1, rolldown-plugin-dts 0.25.1 → 0.25.2, rollup 4.60.4 → 4.61.1, ts-patch 4 (already on), commander 14 → 15 (major, no rewrite needed), favicons 7.2 → 7.3, typescript-transform-paths 3.5 → 4.0 (major, no rewrite needed), storybook 10.4.0 → 10.4.4, vite 8.0.13 → 8.0.16, next 16.2.6 → 16.2.9, vitest 4.1.6 → 4.1.8, biome 2.4.15 → 2.4.16, @types/node 25.8 → 25.9, react 19.2.6 → 19.2.7.

  **zod held at `~4.3.6`** — `bun update --latest` again tried to bump to 4.4.x, which still breaks `@modelcontextprotocol/sdk` 1.29.0's `AnySchema` type (the SDK has not yet shipped zod-4.4-compatible types).

  **Storybook peer ranges restored to wide** (recurring `--latest` regression): `react`/`react-dom` → `>=19`, `react-native` → `>=0.74`, `react-native-web` → `>=0.19`.

  **CI actions** (SHA-pinned): checkout v6.0.2 → v6.0.3, changesets/action v1.8.0 → v1.9.0, codecov/codecov-action v6.0.0 → v7.0.0 (major), step-security/harden-runner v2.19.3 → v2.19.4, github/codeql-action v4.35.5 → v4.36.2.

  Verified e2e: 576 tests pass, typecheck + lint clean, all 10 packages build.

- Updated dependencies [[`afa223f`](https://github.com/vitus-labs/tools/commit/afa223f7d3ac8f9b41f4f5b547acb2ab14c9e6e1)]:
  - @vitus-labs/tools-core@2.6.0

## 2.5.0

### Minor Changes

- [#141](https://github.com/vitus-labs/tools/pull/141) [`b61f6cf`](https://github.com/vitus-labs/tools/commit/b61f6cfb36b3ad94103253a489adec305f398568) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Expose `sourcemap` as a configurable option, mirroring rolldown's native `output.sourcemap` API. Previously hardcoded to `true`.

  ```js
  // vl-tools.config.mjs
  export default {
    build: {
      sourcemap: "hidden", // boolean | 'inline' | 'hidden', default: true
    },
  };
  ```

  Semantics (verified end-to-end against on-disk artifacts):

  | value            | `.js.map` file | `sourceMappingURL` comment | inline data URL       |
  | ---------------- | -------------- | -------------------------- | --------------------- |
  | `true` (default) | yes            | yes                        | no                    |
  | `'hidden'`       | yes            | **no**                     | no                    |
  | `'inline'`       | no             | yes                        | yes (base64 embedded) |
  | `false`          | no             | no                         | no                    |

  Motivating use case: closed-source consumers who want maps for error-reporting services (Sentry, Datadog) without shipping the `sourceMappingURL` comment that leaks source in the deployed bundle — `'hidden'` is the answer.

  Default is `true` — existing builds are bit-for-bit unchanged.

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.5.0

## 2.4.0

### Minor Changes

- [#139](https://github.com/vitus-labs/tools/pull/139) [`06592e4`](https://github.com/vitus-labs/tools/commit/06592e493e061bbe51176d1ac3b7a833d2a6eff5) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Fix correctness bug: multi-subpath packages now dedupe shared modules into a chunk instead of inlining a separate copy into every entry.

  **Before**: each sub-entry was a separate `rolldown()` invocation with a single input, so any module imported by 2+ entries was inlined into each entry's output. For pure-function code this was wasted bytes; for modules with module-level identity-bearing state (`createContext`, `Symbol.for`/`Symbol(...)` factories, singleton registries, etc.) it was a silent **correctness bug** — each inlined copy minted its own identity at module-eval time, and cross-entry lookups failed without warning. Surfaced in the field as silently-dropped SEO meta tags in `@pyreon/head`'s SSR path.

  **After**: variants are partitioned by `(format, env, platform)`. Groups of 2+ entries that all use chunkable formats (i.e. not UMD/IIFE) are emitted in a **single** rolldown invocation with `input` as an entry map and `chunkFileNames: '_chunks/[name]-[hash].js'`. Rolldown's native multi-entry mode then emits any module imported by ≥2 entries as one shared chunk; entries `import` from it. Singletons and UMD/IIFE keep the per-entry path unchanged.

  Verified on a minimal `@pyreon/head`-shaped reproduction (3 sub-entries sharing a `sentinel.ts` exporting `Symbol(...)` + `Map`):

  |                                                                  | before            | after                   |
  | ---------------------------------------------------------------- | ----------------- | ----------------------- |
  | `Symbol("shared-sentinel")` occurrences across all `.js` outputs | 3 (one per entry) | **1** (in shared chunk) |
  | `SENTINEL` identity equal across all entries                     | **false**         | **true**                |
  | `idx.REGISTRY.size` after `use.writeFromUse(...)`                | 0 (write lost)    | **1**                   |
  | `peek.peekFromPeek()` after that write                           | `undefined`       | `'hello from use'`      |

  DTS generation is unchanged (still per-entry through `buildDtsIsolated`) — types carry no runtime identity, so per-entry is fine and keeps the DTS pipeline simple.

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.4.0

## 2.3.1

### Patch Changes

- [#132](https://github.com/vitus-labs/tools/pull/132) [`fd69af8`](https://github.com/vitus-labs/tools/commit/fd69af88a779007c4697ad77620d7d6dfed18b81) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Audit fixes — three proven issues, each measured and regression-tested.

  **1. atlas: scanner N+1 `statSync` (perf)** — `listDirectories` called `statSync` once per directory entry. Now uses `readdirSync(base, { withFileTypes: true })` and only falls back to `statSync` for symbolic links (which `Dirent.isDirectory()` can't resolve). Measured on a 65-entry workspace: **65 → 5 syscalls (92% fewer)**, identical directory output including symlinked package dirs (regression-tested).

  **2. rolldown: temp-dir leak on error path (resource leak)** — `buildDtsIsolated` removed its `__dts_tmp_*` directory only on the success path. If the DTS build or any post-processing step threw, the temp dir leaked into `lib/` and shipped in the published package (`files: ["lib"]`). Cleanup is now in a `finally` block. Proven by a test that fails on the old code (0 cleanup calls) and passes after.

  **3. rolldown + rollup: drop the `rimraf` dependency** — both packages require Node ≥ 22, where the built-in `fs.rmSync(path, { recursive: true, force: true })` does exactly what `rimraf.sync` did. Removed `rimraf` as a direct dependency from both packages — one fewer runtime dependency and supply-chain surface, zero behavior change.

  No memory leaks were found. Four separately-reported correctness concerns (depth-map inversion, cycle self-loop handling, bundle-size I/O, transitive-size dedup) were investigated and disproven by tracing the actual code — no changes made there.

- [#134](https://github.com/vitus-labs/tools/pull/134) [`0a8a65b`](https://github.com/vitus-labs/tools/commit/0a8a65bf010aed4944317fa2c6617ca30118769c) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Update all dependencies to latest and bump CI actions.

  **Runtime/dev deps**: rolldown 1.0.0-rc.17 → 1.0.1, rolldown-plugin-dts 0.23.2 → 0.25.1, rollup 4.60.2 → 4.60.4, ts-patch 3.3.0 → 4.0.1 (major — verified, no code changes needed), storybook 10.3.5 → 10.4, vite 8.0.10 → 8.0.13, next 16.2.4 → 16.2.6, @types/node 25.6 → 25.8, biome 2.4.13 → 2.4.15, vitest 4.1.5 → 4.1.6, react 19.2.5 → 19.2.6, `@vitus-labs/tools-lint` 1.15.5 → 2.3.0.

  **zod held at `~4.3.6`** (was `^4.4.3` candidate): zod 4.4.x changed `ZodString`/`ZodEnum` internals so they no longer satisfy the MCP SDK's `AnySchema` type. `@modelcontextprotocol/sdk` is already at its latest (1.29.0) and its published types were built against zod 4.3.x. Pinned to `~4.3.6` (4.3.x patches allowed, 4.4 blocked) until the SDK ships zod-4.4-compatible types. Not a fixable-on-our-side rewrite — the incompatibility is entirely between two third-party packages' type definitions.

  **Storybook peer ranges restored**: `bun update --latest` again narrowed `react`/`react-dom`/`react-native`/`react-native-web` peers; reverted to the intended wide ranges (`>=19`, `>=0.74`, `>=0.19`).

  **CI actions**: setup-node v6.3.0 → v6.4.0, changesets/action v1.7.0 → v1.8.0, step-security/harden-runner v2.17.0 → v2.19.3, github/codeql-action v4.35.1 → v4.35.5 (all SHA-pinned).

  Verified e2e: 565 tests pass, typecheck + lint clean across all 10 packages, all 10 packages build.

- Updated dependencies []:
  - @vitus-labs/tools-core@2.3.1

## 2.3.0

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.3.0

## 2.2.0

### Patch Changes

- [#119](https://github.com/vitus-labs/tools/pull/119) [`a1726d5`](https://github.com/vitus-labs/tools/commit/a1726d5b7e98368db23b0a03cddd6c0472549cea) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Switch shared `@vitus-labs/tools-typescript/lib` tsconfig to `module: "NodeNext"` + `moduleResolution: "NodeNext"` + `rewriteRelativeImportExtensions: true`.

  **Why**: The previous `Bundler` resolution was permissive about extensions. As a result, packages could ship source with extensionless relative imports (or just stale `.js` references) that built and typechecked cleanly but failed at runtime under Node's strict ESM resolver. This bit `@vitus-labs/tools-nextjs-images` (had to be pinned to 1.7.0 by a consumer) and `@vitus-labs/tools-nextjs`. Under NodeNext, missing extensions are a compile error — the bug class is now caught at build time instead of at the consumer's runtime.

  **Source convention is now `.ts`/`.tsx` extensions**: `import x from './foo.ts'` in source, which TS rewrites to `./foo.js` at emit. This is the modern TS-ESM pattern (TS 5.7+). The previous `.js`-in-source convention still works — `rewriteRelativeImportExtensions` only rewrites `.ts`/`.tsx`, leaving `.js` untouched.

  **Internal**: CJS rollup plugins (`rollup-plugin-filesize`, `rollup-plugin-typescript2`, `@rollup/plugin-replace`, `@rollup/plugin-terser`) are now loaded via `createRequire` to avoid CJS/ESM default-import friction under stricter NodeNext type-checking. Same runtime, cleaner type inference.

  **Consumer migration** (if extending `@vitus-labs/tools-typescript/lib`): no action required if your source already uses `.js` extensions on relative imports. If you have extensionless relative imports, TS will now error and tell you the correct fix.

- Updated dependencies []:
  - @vitus-labs/tools-core@2.2.0

## 2.1.0

### Minor Changes

- [#112](https://github.com/vitus-labs/tools/pull/112) [`917fed1`](https://github.com/vitus-labs/tools/commit/917fed1e5e6c21e62e7edc112198d22092deddbe) Thanks [@vitbokisch](https://github.com/vitbokisch)! - External package names now also match deep imports. Listing `echarts` as an external automatically externalizes `echarts/core`, `echarts/charts/BarChart`, etc. — no need to enumerate every subpath.

  This applies to both `package.json` dependencies/peerDependencies (auto-externalized) and entries in `CONFIG.external`. Users who need granular control can still pass a `RegExp` directly in `CONFIG.external` — it will be used as-is.

  **Behavior change**: previously, only exact-match strings were externalized. If you relied on a package's deep imports being bundled while the bare import was external, you'll need to handle that explicitly now.

### Patch Changes

- [#114](https://github.com/vitus-labs/tools/pull/114) [`a8659c5`](https://github.com/vitus-labs/tools/commit/a8659c5af954580e3b7ee98ae94e9ef84aa2f0ff) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Three bug fixes for build-time configuration handling. All three previously produced wrong-but-successful builds — externals not applied, bundles ballooning silently.

  **1. Throw on `vl-tools.config.mjs` load failure** — a malformed config (syntax error, throwing top-level code) used to print a stderr warning and silently fall back to defaults. Now throws with the file path and underlying parse error.

  **2. Subpath imports of declared deps now externalize** — listing `echarts` in dependencies/peerDependencies previously externalized the bare import only; `echarts/core`, `echarts/charts/BarChart`, etc. got bundled. Each declared dep is now expanded into a regex matching the bare name and any subpath. The `expandExternal` helper lives in `@vitus-labs/tools-core` and is reused by both `tools-rolldown` and `tools-rollup`.

  **3. `optionalDependencies` now externalized by default** — only `dependencies` + `peerDependencies` were considered before. Packages putting heavy renderers (pdfmake, docx, exceljs) in `optionalDependencies` ended up bundling them. If you actually want an optional dep bundled, move it to `dependencies`.

  The combined effect: declared deps in any of the three dep fields, including their subpaths, are now correctly externalized. The pre-existing `expandExternal` in `tools-rolldown` (added in v2.0.1) has been removed in favor of the canonical implementation in `tools-core`.

- Updated dependencies [[`a8659c5`](https://github.com/vitus-labs/tools/commit/a8659c5af954580e3b7ee98ae94e9ef84aa2f0ff)]:
  - @vitus-labs/tools-core@2.1.0

## 2.0.0

### Patch Changes

- [#110](https://github.com/vitus-labs/tools/pull/110) [`e837583`](https://github.com/vitus-labs/tools/commit/e8375834e2c55ebecc9bc5bf476c6e157dae23a8) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Bulk dependency updates and TypeScript 6 migration.

  **Breaking (typescript)**: TypeScript peer dep bumped from `^5.9.3` to `^6.0.3`. Consumers must upgrade to TypeScript 6.

  **Notable internal updates**:

  - `@modelcontextprotocol/sdk` 1.27 → 1.29, `zod` 3 → 4 (mcp)
  - `vite` 7 → 8, `storybook` 10.2 → 10.3 (storybook)
  - `rolldown` rc.9 → rc.17, `rolldown-plugin-dts` 0.22 → 0.23 (rolldown)
  - `rollup` 4.59 → 4.60 (rollup)
  - `next` 16.1 → 16.2 (nextjs, nextjs-images)
  - `vitest` 4.1.0 → 4.1.5 (vitest)

  **Storybook peer deps restored**: Earlier auto-update inadvertently narrowed `react`, `react-dom`, `react-native`, and `react-native-web` peer ranges. Restored to original wide ranges.

  Other packages received patch-level dev dep bumps and a TypeScript 6 baseUrl cleanup in tsconfigs (no consumer-facing change).

- Updated dependencies [[`e837583`](https://github.com/vitus-labs/tools/commit/e8375834e2c55ebecc9bc5bf476c6e157dae23a8)]:
  - @vitus-labs/tools-core@2.0.0

## 1.15.5

### Patch Changes

- [#98](https://github.com/vitus-labs/tools/pull/98) [`9ec732d`](https://github.com/vitus-labs/tools/commit/9ec732d7899c10e035cce253088eaa10bf63f1af) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Resolve `.tsx`, `.js`, and `.jsx` extensions for DTS subpath export inputs instead of assuming `.ts`

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.5

## 1.15.4

### Patch Changes

- [#85](https://github.com/vitus-labs/tools/pull/85) [`c0b6735`](https://github.com/vitus-labs/tools/commit/c0b6735c3255f0fa275d247b3dee6f95696e0fda) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Pass `emitDtsOnly: true` to rolldown-plugin-dts to prevent JS output chunks in declaration builds

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.4

## 1.15.3

### Patch Changes

- [`559aa76`](https://github.com/vitus-labs/tools/commit/559aa76cbcfd95f21a20d15a38cea04174294192) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Build each DTS entry in an isolated temp dir to prevent collisions with subpath exports

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.3

## 1.15.2

### Patch Changes

- [`99a7d1f`](https://github.com/vitus-labs/tools/commit/99a7d1f5548f81009a616baeb726487e0affcaa6) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Fix DTS generation collisions for packages with multiple subpath exports

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.2

## 1.15.1

### Patch Changes

- [`2aa6a53`](https://github.com/vitus-labs/tools/commit/2aa6a531eac6b1f48bdd81b0883efa8672e7b29d) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Fix DTS generation collisions for packages with multiple subpath exports

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.1

## 1.15.0

### Patch Changes

- [`41ac6c5`](https://github.com/vitus-labs/tools/commit/41ac6c5288dec3d1e113db15c2a62a042174f6b4) Thanks [@vitbokisch](https://github.com/vitbokisch)! - **vitest**: Upgrade to vite 8 peer dependency. Plugin types use `unknown[]` for cross-version compatibility.

  **rolldown**: Skip passthrough exports (e.g. `"./package.json": "./package.json"`) and exports without build conditions.

  **all**: Update next 16.1.7, vite 8.0.0. Fix publish script tarball parsing.

- Updated dependencies [[`41ac6c5`](https://github.com/vitus-labs/tools/commit/41ac6c5288dec3d1e113db15c2a62a042174f6b4)]:
  - @vitus-labs/tools-core@1.15.0

## 1.14.0

### Minor Changes

- [`3605125`](https://github.com/vitus-labs/tools/commit/36051255315da3d87a2a6b8d6b7ecd8cb9f718f9) Thanks [@vitbokisch](https://github.com/vitbokisch)! - **rolldown**: Auto-derive build entries from package.json subpath exports (e.g., `"./devtools"`, `"./validation/zod"`). Generates separate `.d.ts` declarations per subpath.

  **vitest**: Export `DEFAULT_COVERAGE_EXCLUDE` and `DEFAULT_COVERAGE_INCLUDE` for `mergeConfig` compatibility. Add `coverageInclude` option.

  **all**: Switch to `workspace:^` protocol, custom publish script with OIDC provenance.

### Patch Changes

- Updated dependencies [[`3605125`](https://github.com/vitus-labs/tools/commit/36051255315da3d87a2a6b8d6b7ecd8cb9f718f9)]:
  - @vitus-labs/tools-core@1.14.0

## 1.13.0

### Minor Changes

- [`d76a254`](https://github.com/vitus-labs/tools/commit/d76a2541c1149d88c2d6af50181e502b78c6d1ec) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Add advanced rolldown build options (entries, bundleAll, copyFiles, banner/footer, alias, plugins) for non-library targets like Chrome extensions, CLI tools, and Lambda functions. Replace Lerna with Changesets for versioning and changelog generation.

### Patch Changes

- Updated dependencies [[`d76a254`](https://github.com/vitus-labs/tools/commit/d76a2541c1149d88c2d6af50181e502b78c6d1ec)]:
  - @vitus-labs/tools-core@1.13.0

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.5.2-alpha.1](https://github.com/vitus-labs/tools/compare/v1.5.2-alpha.0...v1.5.2-alpha.1) (2026-02-07)

**Note:** Version bump only for package @vitus-labs/tools-rolldown

## [1.5.2-alpha.0](https://github.com/vitus-labs/tools/compare/v1.5.1...v1.5.2-alpha.0) (2026-02-06)

**Note:** Version bump only for package @vitus-labs/tools-rolldown
