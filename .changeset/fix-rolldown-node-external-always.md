---
'@vitus-labs/tools-rolldown': patch
---

Make `node:*` externalization robust against per-package `external` overrides.

**The gap.** `node:*` was added to `baseConfig.external` (a user-overridable default). But `deepMerge` replaces arrays wholesale — so any package that sets its own `external` in `vl-tools.config.mjs` (e.g. to add `echarts` subpaths) silently dropped the `/^node:/` default and started emitting `UNRESOLVED_IMPORT` warnings on every `node:fs`/`node:path`/etc. import again. Not cosmetic: it's a regression-prone class — any package overriding `external` for any reason re-opened it.

**The fix.** `node:*` is a hard invariant — a `node:` import is never a real module a library could bundle. Moved it out of the overridable `baseConfig.external` into an `ALWAYS_EXTERNAL` constant in `rolldown/config.ts` that `resolveExternals` spreads in unconditionally, independent of `CONFIG.external`. A package's `external` override is still honored (their entries are added), but can no longer drop node-builtin externalization.

Regression-locked with two unit tests (package overrides `external`; `external` empty) — both fail without the fix, pass with it. Verified end-to-end: full monorepo build emits 0 `node:*` UNRESOLVED_IMPORT warnings, and a probe package that overrides `external` keeps `node:fs` external.

Note: the related SOURCEMAP_BROKEN-on-isolated-path concern was investigated and does **not** reproduce — both the isolated and grouped DTS paths share `createDtsConfig`, which already sets `dts({ sourcemap: false })`. A single-entry build emits 0 SOURCEMAP_BROKEN warnings. No change needed.
