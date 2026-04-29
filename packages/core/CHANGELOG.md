# Change Log

## 2.2.0

## 2.1.0

### Patch Changes

- [#114](https://github.com/vitus-labs/tools/pull/114) [`a8659c5`](https://github.com/vitus-labs/tools/commit/a8659c5af954580e3b7ee98ae94e9ef84aa2f0ff) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Three bug fixes for build-time configuration handling. All three previously produced wrong-but-successful builds — externals not applied, bundles ballooning silently.

  **1. Throw on `vl-tools.config.mjs` load failure** — a malformed config (syntax error, throwing top-level code) used to print a stderr warning and silently fall back to defaults. Now throws with the file path and underlying parse error.

  **2. Subpath imports of declared deps now externalize** — listing `echarts` in dependencies/peerDependencies previously externalized the bare import only; `echarts/core`, `echarts/charts/BarChart`, etc. got bundled. Each declared dep is now expanded into a regex matching the bare name and any subpath. The `expandExternal` helper lives in `@vitus-labs/tools-core` and is reused by both `tools-rolldown` and `tools-rollup`.

  **3. `optionalDependencies` now externalized by default** — only `dependencies` + `peerDependencies` were considered before. Packages putting heavy renderers (pdfmake, docx, exceljs) in `optionalDependencies` ended up bundling them. If you actually want an optional dep bundled, move it to `dependencies`.

  The combined effect: declared deps in any of the three dep fields, including their subpaths, are now correctly externalized. The pre-existing `expandExternal` in `tools-rolldown` (added in v2.0.1) has been removed in favor of the canonical implementation in `tools-core`.

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

## 1.15.5

## 1.15.4

## 1.15.3

## 1.15.2

## 1.15.1

## 1.15.0

### Patch Changes

- [`41ac6c5`](https://github.com/vitus-labs/tools/commit/41ac6c5288dec3d1e113db15c2a62a042174f6b4) Thanks [@vitbokisch](https://github.com/vitbokisch)! - **vitest**: Upgrade to vite 8 peer dependency. Plugin types use `unknown[]` for cross-version compatibility.

  **rolldown**: Skip passthrough exports (e.g. `"./package.json": "./package.json"`) and exports without build conditions.

  **all**: Update next 16.1.7, vite 8.0.0. Fix publish script tarball parsing.

## 1.14.0

### Patch Changes

- [`3605125`](https://github.com/vitus-labs/tools/commit/36051255315da3d87a2a6b8d6b7ecd8cb9f718f9) Thanks [@vitbokisch](https://github.com/vitbokisch)! - **rolldown**: Auto-derive build entries from package.json subpath exports (e.g., `"./devtools"`, `"./validation/zod"`). Generates separate `.d.ts` declarations per subpath.

  **vitest**: Export `DEFAULT_COVERAGE_EXCLUDE` and `DEFAULT_COVERAGE_INCLUDE` for `mergeConfig` compatibility. Add `coverageInclude` option.

  **all**: Switch to `workspace:^` protocol, custom publish script with OIDC provenance.

## 1.13.0

### Minor Changes

- [`d76a254`](https://github.com/vitus-labs/tools/commit/d76a2541c1149d88c2d6af50181e502b78c6d1ec) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Add advanced rolldown build options (entries, bundleAll, copyFiles, banner/footer, alias, plugins) for non-library targets like Chrome extensions, CLI tools, and Lambda functions. Replace Lerna with Changesets for versioning and changelog generation.

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.5.2-alpha.1](https://github.com/vitus-labs/tools/compare/v1.5.2-alpha.0...v1.5.2-alpha.1) (2026-02-07)

**Note:** Version bump only for package @vitus-labs/tools-core

## [1.5.2-alpha.0](https://github.com/vitus-labs/tools/compare/v1.5.1...v1.5.2-alpha.0) (2026-02-06)

**Note:** Version bump only for package @vitus-labs/tools-core
