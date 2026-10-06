---
'@vitus-labs/tools-typescript': minor
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-mcp': patch
---

TypeScript 7 support

- `tools-typescript`: peer range widened to `^6.0.3 || ^7.0.0`; the presets work unchanged with the native TypeScript 7 compiler.
- `tools-rolldown` works with TypeScript 7 out of the box — `rolldown-plugin-dts` switches to its `tsgo` generator automatically.
- `tools-rollup`: now declares its `typescript` peer (`^5.0.0 || ^6.0.0`). Its TypeScript plugins (`rollup-plugin-typescript2`, `ts-patch`) need the TypeScript JavaScript API, which TypeScript 7 no longer ships — use `tools-rolldown` with TypeScript 7.
- The repository itself is now built and type-checked with TypeScript 7.0.2.
