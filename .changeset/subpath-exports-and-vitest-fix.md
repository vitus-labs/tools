---
'@vitus-labs/tools-rolldown': minor
'@vitus-labs/tools-vitest': patch
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

**rolldown**: Auto-derive build entries from package.json subpath exports (e.g., `"./devtools"`, `"./validation/zod"`). Generates separate `.d.ts` declarations per subpath.

**vitest**: Export `DEFAULT_COVERAGE_EXCLUDE` and `DEFAULT_COVERAGE_INCLUDE` for `mergeConfig` compatibility. Add `coverageInclude` option.

**all**: Switch to `workspace:^` protocol, custom publish script with OIDC provenance.
