---
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-favicon': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-lint': patch
'@vitus-labs/tools-mcp': patch
---

Update dependencies to their latest versions

- `chalk` 5 -> 6 (Node >= 22, already the minimum for these packages)
- `rolldown` 1.1 -> 1.2, `rolldown-plugin-dts` 0.26 -> 0.28
- `rollup` 4.62 -> 4.63, `@microsoft/api-extractor` 7.58 -> 7.59, `rollup-plugin-visualizer` 7.0 -> 7.1
- `@biomejs/biome` 2.5.1 -> 2.5.10
- Storybook 10.4 -> 10.5 and related addons
- `@modelcontextprotocol/sdk` 1.29 -> 1.30, `zod` 4.3 -> 4.4
- `favicons` 7.3.0 -> 7.3.1
