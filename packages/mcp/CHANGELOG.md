# @vitus-labs/tools-mcp

## 2.1.0

## 2.0.0

### Minor Changes

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
