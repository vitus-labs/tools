---
'@vitus-labs/tools-rolldown': minor
---

Generate declarations for all sub-entries in a single `rolldown()` call instead of one call per entry.

Each per-entry call instantiates the slow `rolldown-plugin-dts:generate` (the TS compiler + plugin state) from scratch — that's the `[PLUGIN_TIMINGS]` warning rolldown itself surfaces. Doing it in one call amortizes that setup AND lets common imports (e.g. a shared `types.ts`) emit as a single `_chunks/*.d.ts` instead of being inlined into every entry's stub.

**Measured on the repo's own DTS fixtures:**

| Fixture | Before (per-entry) | After (single-pass) | Speedup |
|---|---|---|---|
| `dts-pipeline` (3 entries, `.tsx` + `.ts`) | 675ms | 380ms | **1.78×** |
| `multi-entry-sharing` (3 entries, shared `sentinel.ts`) | 551ms | 348ms | **1.58×** |

Scales further with entry count — the per-call plugin instantiation cost is the dominant overhead, now amortized.

**Same architecture as PR #139's JS multi-entry fix**: partition DTS configs by output dir, run groups of ≥2 entries in one call, keep single-entry packages on the existing `buildDtsIsolated` path. The temp-dir / "find largest `.d.ts`" trick that handles the plugin's `<name>.d.ts` stub + `<name>2.d.ts` real pair is preserved, just batched across all entries.

**Regression-locked** in the integration test: the build output is asserted to contain the `single-pass` log marker AND to NOT contain the per-entry timing lines for grouped entries. A silent fallback to the old path would fail the test.
