---
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-lint': patch
'@vitus-labs/tools-mcp': patch
---

Update dependencies to their latest minor/patch versions

- `rolldown` 1.2.6 -> 1.2.12, `rolldown-plugin-dts` 0.28.2 -> 0.28.6
- `rollup` 4.63 -> 4.64, `@microsoft/api-extractor` 7.59.0 -> 7.59.4
- `chalk` 6.0.0 -> 6.0.1
- `@biomejs/biome` 2.5.10 -> 2.5.15
- Storybook 10.5 -> 10.6 and related addons, `vite` 8.2 -> 8.3
- `@modelcontextprotocol/sdk` 1.30 -> 1.32, `zod` 4.4 -> 4.6
- `tools-mcp`: scaffolded `biome.json` files now reference the current Biome schema (2.5.15) instead of 2.4.7
