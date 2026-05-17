---
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-mcp': patch
'@vitus-labs/tools-nextjs': patch
'@vitus-labs/tools-nextjs-images': patch
---

Update all dependencies to latest and bump CI actions.

**Runtime/dev deps**: rolldown 1.0.0-rc.17 → 1.0.1, rolldown-plugin-dts 0.23.2 → 0.25.1, rollup 4.60.2 → 4.60.4, ts-patch 3.3.0 → 4.0.1 (major — verified, no code changes needed), storybook 10.3.5 → 10.4, vite 8.0.10 → 8.0.13, next 16.2.4 → 16.2.6, @types/node 25.6 → 25.8, biome 2.4.13 → 2.4.15, vitest 4.1.5 → 4.1.6, react 19.2.5 → 19.2.6, `@vitus-labs/tools-lint` 1.15.5 → 2.3.0.

**zod held at `~4.3.6`** (was `^4.4.3` candidate): zod 4.4.x changed `ZodString`/`ZodEnum` internals so they no longer satisfy the MCP SDK's `AnySchema` type. `@modelcontextprotocol/sdk` is already at its latest (1.29.0) and its published types were built against zod 4.3.x. Pinned to `~4.3.6` (4.3.x patches allowed, 4.4 blocked) until the SDK ships zod-4.4-compatible types. Not a fixable-on-our-side rewrite — the incompatibility is entirely between two third-party packages' type definitions.

**Storybook peer ranges restored**: `bun update --latest` again narrowed `react`/`react-dom`/`react-native`/`react-native-web` peers; reverted to the intended wide ranges (`>=19`, `>=0.74`, `>=0.19`).

**CI actions**: setup-node v6.3.0 → v6.4.0, changesets/action v1.7.0 → v1.8.0, step-security/harden-runner v2.17.0 → v2.19.3, github/codeql-action v4.35.1 → v4.35.5 (all SHA-pinned).

Verified e2e: 565 tests pass, typecheck + lint clean across all 10 packages, all 10 packages build.
