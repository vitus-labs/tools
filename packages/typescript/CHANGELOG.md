# Change Log

## 2.8.0

### Minor Changes

- [#211](https://github.com/vitus-labs/tools/pull/211) [`d9f98a8`](https://github.com/vitus-labs/tools/commit/d9f98a8ca6147ae94196b53c1a382fd9944e2646) Thanks [@vitbokisch](https://github.com/vitbokisch)! - TypeScript 7 support
  
  - `tools-typescript`: peer range widened to `^6.0.3 || ^7.0.0`; the presets work unchanged with the native TypeScript 7 compiler.
  - `tools-rolldown` works with TypeScript 7 out of the box — `rolldown-plugin-dts` switches to its `tsgo` generator automatically.
  - `tools-rollup`: now declares its `typescript` peer (`^5.0.0 || ^6.0.0`). Its TypeScript plugins (`rollup-plugin-typescript2`, `ts-patch`) need the TypeScript JavaScript API, which TypeScript 7 no longer ships — use `tools-rolldown` with TypeScript 7.
  - The repository itself is now built and type-checked with TypeScript 7.0.2.

### Patch Changes

- [#216](https://github.com/vitus-labs/tools/pull/216) [`9d6cf19`](https://github.com/vitus-labs/tools/commit/9d6cf19b9822a506176a05ab4486d645f8424589) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Config preset fixes.
  
  - vitest: resolve `aliases` against the Vite project root (new optional `root` option) instead of `process.cwd()`, so they work with `test.projects`; declare optional peer `@vitest/coverage-v8`; widen `vite` peer to `^6 || ^7 || ^8`; correct `pool`/`css` docs; `types` export condition first plus `default`.
  - nextjs: `headers` record now matches keys case-insensitively, appends unknown headers and removes defaults set to `false`/`null`; `withVitusLabs` accepts a config function; README uses `cacheComponents`; `types` export condition first plus `default`.
  - typescript: presets no longer declare `include`/`exclude` (they resolved inside `node_modules` for consumers) - set them in your own tsconfig; README peer range corrected.

## 2.7.1

## 2.7.0

## 2.6.3

## 2.6.2

## 2.6.1

## 2.6.0

## 2.5.0

## 2.4.0

## 2.3.1

## 2.3.0

### Minor Changes

- [#122](https://github.com/vitus-labs/tools/pull/122) [`b404896`](https://github.com/vitus-labs/tools/commit/b404896ac27390ea6621559f67b2585f664c226e) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Add a `node` tsconfig preset and revert `lib` back to `Bundler` resolution.

  ```json
  // For libraries bundled by rolldown/rollup/etc — what most consumers want:
  { "extends": "@vitus-labs/tools-typescript/lib" }

  // For server/CLI packages built with plain tsc and consumed as Node ESM:
  { "extends": "@vitus-labs/tools-typescript/node" }
  ```

  **Why**: 2.2.0 ([#119](https://github.com/vitus-labs/tools/issues/119)) over-corrected by switching `lib` to `NodeNext` to surface a runtime ESM bug in two packages. But `Bundler` is the TS team's recommended setting for code that goes through a bundler — which is most "library" use cases. The right architecture is two presets:

  - **`lib` (Bundler, restored)** — for libraries that get bundled. Permissive about extensions because the bundler resolves them. Has DOM + jsx.
  - **`node` (NodeNext + rewriteRelativeImportExtensions, new)** — for pure Node packages. Strict about extensions because Node's resolver is. No DOM, no jsx, no allowJs.

  The `nextjs` preset is unchanged.

  If your package is bundled before consumers see it, use `lib`. If it ships raw `.js` that Node loads directly (like every package in this monorepo), use `node` — the strictness catches the missing-extension bug class at build time.

## 2.2.0

### Minor Changes

- [#119](https://github.com/vitus-labs/tools/pull/119) [`a1726d5`](https://github.com/vitus-labs/tools/commit/a1726d5b7e98368db23b0a03cddd6c0472549cea) Thanks [@vitbokisch](https://github.com/vitbokisch)! - Switch shared `@vitus-labs/tools-typescript/lib` tsconfig to `module: "NodeNext"` + `moduleResolution: "NodeNext"` + `rewriteRelativeImportExtensions: true`.

  **Why**: The previous `Bundler` resolution was permissive about extensions. As a result, packages could ship source with extensionless relative imports (or just stale `.js` references) that built and typechecked cleanly but failed at runtime under Node's strict ESM resolver. This bit `@vitus-labs/tools-nextjs-images` (had to be pinned to 1.7.0 by a consumer) and `@vitus-labs/tools-nextjs`. Under NodeNext, missing extensions are a compile error — the bug class is now caught at build time instead of at the consumer's runtime.

  **Source convention is now `.ts`/`.tsx` extensions**: `import x from './foo.ts'` in source, which TS rewrites to `./foo.js` at emit. This is the modern TS-ESM pattern (TS 5.7+). The previous `.js`-in-source convention still works — `rewriteRelativeImportExtensions` only rewrites `.ts`/`.tsx`, leaving `.js` untouched.

  **Internal**: CJS rollup plugins (`rollup-plugin-filesize`, `rollup-plugin-typescript2`, `@rollup/plugin-replace`, `@rollup/plugin-terser`) are now loaded via `createRequire` to avoid CJS/ESM default-import friction under stricter NodeNext type-checking. Same runtime, cleaner type inference.

  **Consumer migration** (if extending `@vitus-labs/tools-typescript/lib`): no action required if your source already uses `.js` extensions on relative imports. If you have extensionless relative imports, TS will now error and tell you the correct fix.

## 2.1.0

## 2.0.0

### Major Changes

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

**Note:** Version bump only for package @vitus-labs/tools-typescript

## [1.5.2-alpha.0](https://github.com/vitus-labs/tools/compare/v1.5.1...v1.5.2-alpha.0) (2026-02-06)

**Note:** Version bump only for package @vitus-labs/tools-typescript
