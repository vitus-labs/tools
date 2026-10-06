---
'@vitus-labs/tools-favicon': patch
---

Fix `vl_favicon` crashing with the default config. `icons` is now the array of `{ input, output, path }` sources (as documented) and the platform toggles moved to `platforms`, which is passed to `favicons` as its `icons` option (the old object shape in `icons` is still accepted with a deprecation warning). The base `path` defaults to `/` (no more `undefined/...` URLs), output directories are created when missing, absolute `input`/`output` paths are respected, and `icons` is validated with a clear error. The package now publishes only `lib/` via a `files` field.
