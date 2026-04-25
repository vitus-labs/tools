---
'@vitus-labs/tools-typescript': major
'@vitus-labs/tools-mcp': minor
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-nextjs': patch
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-vitest': patch
'@vitus-labs/tools-core': patch
'@vitus-labs/tools-atlas': patch
'@vitus-labs/tools-favicon': patch
'@vitus-labs/tools-lint': patch
---

Bulk dependency updates and TypeScript 6 migration.

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
