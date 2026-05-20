---
'@vitus-labs/tools-rolldown': minor
---

Fix correctness bug: multi-subpath packages now dedupe shared modules into a chunk instead of inlining a separate copy into every entry.

**Before**: each sub-entry was a separate `rolldown()` invocation with a single input, so any module imported by 2+ entries was inlined into each entry's output. For pure-function code this was wasted bytes; for modules with module-level identity-bearing state (`createContext`, `Symbol.for`/`Symbol(...)` factories, singleton registries, etc.) it was a silent **correctness bug** — each inlined copy minted its own identity at module-eval time, and cross-entry lookups failed without warning. Surfaced in the field as silently-dropped SEO meta tags in `@pyreon/head`'s SSR path.

**After**: variants are partitioned by `(format, env, platform)`. Groups of 2+ entries that all use chunkable formats (i.e. not UMD/IIFE) are emitted in a **single** rolldown invocation with `input` as an entry map and `chunkFileNames: '_chunks/[name]-[hash].js'`. Rolldown's native multi-entry mode then emits any module imported by ≥2 entries as one shared chunk; entries `import` from it. Singletons and UMD/IIFE keep the per-entry path unchanged.

Verified on a minimal `@pyreon/head`-shaped reproduction (3 sub-entries sharing a `sentinel.ts` exporting `Symbol(...)` + `Map`):

| | before | after |
|---|---|---|
| `Symbol("shared-sentinel")` occurrences across all `.js` outputs | 3 (one per entry) | **1** (in shared chunk) |
| `SENTINEL` identity equal across all entries | **false** | **true** |
| `idx.REGISTRY.size` after `use.writeFromUse(...)` | 0 (write lost) | **1** |
| `peek.peekFromPeek()` after that write | `undefined` | `'hello from use'` |

DTS generation is unchanged (still per-entry through `buildDtsIsolated`) — types carry no runtime identity, so per-entry is fine and keeps the DTS pipeline simple.
