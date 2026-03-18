---
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-vitest': minor
'@vitus-labs/tools-atlas': patch
'@vitus-labs/tools-core': patch
'@vitus-labs/tools-favicon': patch
'@vitus-labs/tools-lint': patch
'@vitus-labs/tools-mcp': patch
'@vitus-labs/tools-nextjs': patch
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-typescript': patch
---

**vitest**: Upgrade to vite 8 peer dependency. Plugin types use `unknown[]` for cross-version compatibility.

**rolldown**: Skip passthrough exports (e.g. `"./package.json": "./package.json"`) and exports without build conditions.

**all**: Update next 16.1.7, vite 8.0.0. Fix publish script tarball parsing.
