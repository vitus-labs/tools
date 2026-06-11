---
'@vitus-labs/tools-atlas': patch
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-nextjs': patch
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-mcp': patch
---

Routine dep refresh + CI action bumps.

**Notable runtime/dev**: rolldown 1.0.3 → 1.1.1, rolldown-plugin-dts 0.25.1 → 0.25.2, rollup 4.60.4 → 4.61.1, ts-patch 4 (already on), commander 14 → 15 (major, no rewrite needed), favicons 7.2 → 7.3, typescript-transform-paths 3.5 → 4.0 (major, no rewrite needed), storybook 10.4.0 → 10.4.4, vite 8.0.13 → 8.0.16, next 16.2.6 → 16.2.9, vitest 4.1.6 → 4.1.8, biome 2.4.15 → 2.4.16, @types/node 25.8 → 25.9, react 19.2.6 → 19.2.7.

**zod held at `~4.3.6`** — `bun update --latest` again tried to bump to 4.4.x, which still breaks `@modelcontextprotocol/sdk` 1.29.0's `AnySchema` type (the SDK has not yet shipped zod-4.4-compatible types).

**Storybook peer ranges restored to wide** (recurring `--latest` regression): `react`/`react-dom` → `>=19`, `react-native` → `>=0.74`, `react-native-web` → `>=0.19`.

**CI actions** (SHA-pinned): checkout v6.0.2 → v6.0.3, changesets/action v1.8.0 → v1.9.0, codecov/codecov-action v6.0.0 → v7.0.0 (major), step-security/harden-runner v2.19.3 → v2.19.4, github/codeql-action v4.35.5 → v4.36.2.

Verified e2e: 576 tests pass, typecheck + lint clean, all 10 packages build.
