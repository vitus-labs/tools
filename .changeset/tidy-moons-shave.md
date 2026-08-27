---
'@vitus-labs/tools-rollup': patch
---

Move `@types/node` to `devDependencies`

It was declared as a runtime dependency, so every consumer installed a
types-only package they never load at runtime. Every other package in the
repo already had it in `devDependencies`.
