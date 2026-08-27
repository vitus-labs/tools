---
'@vitus-labs/tools-rolldown': minor
'@vitus-labs/tools-rollup': minor
'@vitus-labs/tools-core': minor
---

Replace `rollup-plugin-filesize` with a built-in size reporter

`rollup-plugin-filesize` was a runtime dependency of both build packages and
pulled 186 transitive packages into every consumer's tree — including a full
npm client (`pacote` -> `cacache` -> `tar`, plus `node-gyp`) and
`colors@1.4.0` — solely to print bundle sizes. Six advisories reached
consumers through that chain, among them the critical `tar` DoS
(GHSA-23hp-3jrh-7fpw). The plugin is unmaintained at 10.0.0, so there was no
upgrade path.

`@vitus-labs/tools-core` now exports a dependency-free `filesize` plugin
built on `node:zlib`, used by both packages. The `filesize` config flag is
unchanged.

Two differences in the reported numbers:

- The **minified size** column is gone. It was produced by running the chunk
  through terser regardless of whether the build minifies.
- **Gzip is now measured on the bytes actually emitted.** The old plugin
  gzipped terser-minified code, so its figure described a hypothetical build
  rather than the real output. Expect a larger, truthful number for
  unminified builds.

Output is now a compact line per chunk that matches the surrounding build
log, instead of a separate boxed panel.
