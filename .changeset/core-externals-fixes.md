---
'@vitus-labs/tools-core': patch
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-rollup': patch
---

Three bug fixes for build-time configuration handling. All three previously produced wrong-but-successful builds — externals not applied, bundles ballooning silently.

**1. Throw on `vl-tools.config.mjs` load failure** — a malformed config (syntax error, throwing top-level code) used to print a stderr warning and silently fall back to defaults. Now throws with the file path and underlying parse error.

**2. Subpath imports of declared deps now externalize** — listing `echarts` in dependencies/peerDependencies previously externalized the bare import only; `echarts/core`, `echarts/charts/BarChart`, etc. got bundled. Each declared dep is now expanded into a regex matching the bare name and any subpath. The `expandExternal` helper lives in `@vitus-labs/tools-core` and is reused by both `tools-rolldown` and `tools-rollup`.

**3. `optionalDependencies` now externalized by default** — only `dependencies` + `peerDependencies` were considered before. Packages putting heavy renderers (pdfmake, docx, exceljs) in `optionalDependencies` ended up bundling them. If you actually want an optional dep bundled, move it to `dependencies`.

The combined effect: declared deps in any of the three dep fields, including their subpaths, are now correctly externalized. The pre-existing `expandExternal` in `tools-rolldown` (added in v2.0.1) has been removed in favor of the canonical implementation in `tools-core`.
