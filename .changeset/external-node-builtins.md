---
'@vitus-labs/tools-rolldown': patch
---

Default-externalize Node builtins (`node:*` imports) in the base config.

Without this, every package that imports `node:fs`, `node:path`, etc. — which is most of them — triggers an `[UNRESOLVED_IMPORT] Could not resolve 'node:fs'` warning on every build. Rolldown is treating them as external implicitly anyway (so output is correct), but the warnings are noise and obscure real unresolved imports.

Single-line change in `packages/rolldown/src/config/baseConfig.ts` — adds `/^node:/` (a RegExp) to the default `external` list. `expandExternal` in `@vitus-labs/tools-core` passes RegExps through unchanged (proven shape; PR #112), so this composes with the per-package string list with no per-package changes needed.

Verified on this monorepo's own packages (atlas, mcp, favicon, rolldown, rollup all import `node:*`): **0 `UNRESOLVED_IMPORT` warnings during build**, builds produce identical output (the imports were already being externalized — only the warning is silenced).

**Side note on the related `SOURCEMAP_BROKEN` fix that was proposed:** verified — it doesn't reproduce in our current code. The warning fires only when DTS sourcemap is enabled (`output.sourcemap: true`), and our DTS config hardcodes `sourcemap: false`. Adding an `onwarn` handler would be a defensive no-op. Skipped for now; can revisit if DTS sourcemap ever becomes configurable.
