---
'@vitus-labs/tools-rollup': patch
---

Fix rollup build correctness: working `vl_build-watch`, CJS `exports.require` output in ESM-only packages, crash on `browser` maps with `false`/string values, bogus typings entry without variants, api-extractor `./` path, visualizer path for bare files, duplicate builds; publish only `lib` and `global`; lazy-load heavy plugins; drop unused dependencies.
