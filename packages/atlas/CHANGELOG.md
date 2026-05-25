# @vitus-labs/tools-atlas

## 2.5.0

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.5.0

## 2.4.0

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

- Updated dependencies []:
  - @vitus-labs/tools-core@2.3.1

## 2.3.0

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.3.0

## 2.2.0

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.2.0

## 2.1.0

### Patch Changes

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

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.5

## 1.15.4

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.4

## 1.15.3

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.3

## 1.15.2

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@1.15.2

## 1.15.1

### Patch Changes

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

### Patch Changes

- [`3605125`](https://github.com/vitus-labs/tools/commit/36051255315da3d87a2a6b8d6b7ecd8cb9f718f9) Thanks [@vitbokisch](https://github.com/vitbokisch)! - **rolldown**: Auto-derive build entries from package.json subpath exports (e.g., `"./devtools"`, `"./validation/zod"`). Generates separate `.d.ts` declarations per subpath.

  **vitest**: Export `DEFAULT_COVERAGE_EXCLUDE` and `DEFAULT_COVERAGE_INCLUDE` for `mergeConfig` compatibility. Add `coverageInclude` option.

  **all**: Switch to `workspace:^` protocol, custom publish script with OIDC provenance.

- Updated dependencies [[`3605125`](https://github.com/vitus-labs/tools/commit/36051255315da3d87a2a6b8d6b7ecd8cb9f718f9)]:
  - @vitus-labs/tools-core@1.14.0

## 1.13.0

### Minor Changes

- [`d76a254`](https://github.com/vitus-labs/tools/commit/d76a2541c1149d88c2d6af50181e502b78c6d1ec) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Add advanced rolldown build options (entries, bundleAll, copyFiles, banner/footer, alias, plugins) for non-library targets like Chrome extensions, CLI tools, and Lambda functions. Replace Lerna with Changesets for versioning and changelog generation.

### Patch Changes

- Updated dependencies [[`d76a254`](https://github.com/vitus-labs/tools/commit/d76a2541c1149d88c2d6af50181e502b78c6d1ec)]:
  - @vitus-labs/tools-core@1.13.0
