---
'@vitus-labs/tools-core': patch
---

Robustness fixes: `PKG.bundleName` no longer throws at import time when `package.json` has no `name` and is always a valid JS identifier (all `@`, `/`, `.` etc. are handled, not just the first); `VL_CONFIG(...).get(key, default)` now keeps falsy defaults (`false`, `0`, `''`) instead of turning them into `{}`; an explicit `undefined` in a user config no longer overrides a default when merging; `loadConfigParam` caches the parsed JSON instead of re-reading it on every call. README now lists `optionalDependencies` in `externalDependencies`.
