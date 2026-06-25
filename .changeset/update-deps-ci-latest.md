---
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-mcp': patch
'@vitus-labs/tools-nextjs': patch
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-atlas': patch
'@vitus-labs/tools-core': patch
'@vitus-labs/tools-favicon': patch
'@vitus-labs/tools-vitest': patch
---

Routine dep refresh + CI action bumps.

**Notable**: rolldown 1.1.1 → 1.1.3, rolldown-plugin-dts 0.25.2 → 0.26.0 (verified — integration tests for single-pass DTS still green), rollup 4.61.1 → 4.62.2, @microsoft/api-extractor 7.58.8 → 7.58.9, storybook 10.4.4 → 10.4.6, vite 8.0.16 → 8.1.0, vitest 4.1.8 → 4.1.9, @types/node 25.9 → 26.0 (major; no consumer rewrite needed).

**zod held at `~4.3.6`** (recurring): `--latest` again tried to bump to 4.4.x; still breaks `@modelcontextprotocol/sdk` 1.29.0's `AnySchema` type. SDK hasn't shipped zod-4.4-compatible types yet.

**Storybook peer ranges restored to wide** (recurring): `react`/`react-dom` → `>=19`, `react-native` → `>=0.74`, `react-native-web` → `>=0.19`.

**Biome held at `~2.4.16`** — 2.5.1 introduced breaking config-schema changes (`linter.rules.recommended` → `preset`, `nursery.noShadow` rule removed/relocated, root-mode default flipped). The `biome migrate` command applied a partial migration that produced a worse-broken config (1,658 lint errors due to expanded include scope). Pinning to 2.4.x for this PR; biome 2.5 migration is its own scoped change.

**CI actions** (SHA-pinned): actions/cache v5.0.5 → **v6.0.0** (major), actions/checkout v6.0.3 → **v7.0.0** (major).

Verified e2e: 579 tests pass, typecheck + lint clean, all 10 packages build, `bun audit --audit-level=critical` clean, zero leaked `__dts_tmp*` dirs.
