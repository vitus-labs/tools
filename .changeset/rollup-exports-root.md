---
'@vitus-labs/tools-rollup': patch
---

Support the standard `exports["."]` subpath-map form. Previously only top-level conditions (`exports.import` / `exports.require`) were read, so a package declaring `exports: { ".": { import, require, types } }` got no CommonJS build for `require` and no declaration path from `exports`. Nested conditions such as `import: { types, default }` are resolved as well.
