# Change Log

## 2.6.0

### Patch Changes

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

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.5.0

## 2.4.0

### Patch Changes

- Updated dependencies []:
  - @vitus-labs/tools-core@2.4.0

## 2.3.1

### Patch Changes

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

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.5.2-alpha.1](https://github.com/vitus-labs/tools/compare/v1.5.2-alpha.0...v1.5.2-alpha.1) (2026-02-07)

**Note:** Version bump only for package @vitus-labs/tools-storybook

## [1.5.2-alpha.0](https://github.com/vitus-labs/tools/compare/v1.5.1...v1.5.2-alpha.0) (2026-02-06)

**Note:** Version bump only for package @vitus-labs/tools-storybook
