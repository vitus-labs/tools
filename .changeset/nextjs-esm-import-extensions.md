---
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-nextjs': patch
---

Fix: relative imports in `tools-nextjs-images` and `tools-nextjs` source files were missing required `.js` extensions, breaking ESM resolution under Node when consumers loaded the packages. The packages built and typechecked cleanly because tsconfig uses `moduleResolution: "Bundler"` which is permissive about extensions, but Node's strict ESM resolver rejects extensionless relative imports.

31 imports fixed in `nextjs-images`, 7 in `nextjs`. No source-level changes — only adds `.js` to relative `import`/`export` paths.
