---
'@vitus-labs/tools-rolldown': patch
---

Fix a build-breaking regression introduced in 2.6.0 for multi-entry-package consumers.

**The bug.** `repairStaleImports` (added in 2.6.0 as part of the grouped DTS pipeline) called `require('node:fs')` inside an ESM module. Node enforces strict ESM and throws `ReferenceError: require is not defined` at runtime; consumers using `node` to run the bin saw a hard build failure. Only multi-entry packages with ≥1 renamed entry during DTS promotion hit it — single-entry packages used a different code path.

**The fix.** Drop the runtime `require()` and import `readFileSync`/`writeFileSync` from `node:fs` at the top of the file alongside the existing fs imports. Plain ESM that both Node and bun accept.

**Why 2.6.0's tests missed it.** The existing integration tests ran the *source* `.ts` bin via *bun*. Bun's runtime is lenient and silently accepts `require()` in ESM as a CJS leniency — masking the bug. Node enforces it strictly. **Added `build.compiled.integration.test.ts`** which runs the *compiled* `lib/bin/run-build.js` via **both `node` and `bun`** against a multi-entry fixture. Verified that the new test fails with the exact `ReferenceError: require is not defined` when the bug is re-introduced and passes after the fix.

**Also**: turned off the plugin's internal sourcemap (`dts({ sourcemap: false })`). DTS output already had `output.sourcemap: false` (declarations don't need maps), but the plugin's fake-js transform still emitted a `[SOURCEMAP_BROKEN]` warning during multi-entry builds because its internal map wasn't chained through. Off at both layers, no warning. DTS files universally don't have a sourcemap use case (no debugger steps through type declarations) — no opt-out exposed.
