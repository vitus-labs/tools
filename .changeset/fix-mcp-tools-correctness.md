---
'@vitus-labs/tools-mcp': patch
---

Fix MCP tool correctness. `add_tooling` and `scaffold_package` no longer overwrite existing files, dependency versions or scripts (skipped items are reported). Scaffolded dependency ranges are current (TypeScript 6, Vitest 4.1, Biome 2.5, tools ^2) and no longer set the deprecated `baseUrl`; scaffolded library names are escaped. Directories must be absolute and failures return `isError`. `diagnose_config` scans all source (including `src/lib`), tolerates JSONC tsconfig files and array `extends`, recognises ESLint flat configs and more `vl_*` scripts. The server reports its real package version and the docs resources are corrected.
