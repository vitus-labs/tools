# @vitus-labs/tools-nextjs

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
