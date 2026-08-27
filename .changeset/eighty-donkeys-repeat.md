---
'@vitus-labs/tools-nextjs-images': patch
'@vitus-labs/tools-storybook': patch
'@vitus-labs/tools-rolldown': patch
'@vitus-labs/tools-favicon': patch
'@vitus-labs/tools-nextjs': patch
'@vitus-labs/tools-rollup': patch
'@vitus-labs/tools-vitest': patch
'@vitus-labs/tools-atlas': patch
'@vitus-labs/tools-core': patch
'@vitus-labs/tools-mcp': patch
---

Pin internal dependencies to the exact version being released

Published packages referenced each other by a range resolved from
`bun.lock`, whose recorded workspace versions are only refreshed when the
lockfile is regenerated from scratch. `bun install` leaves them alone, even
with `--force`, so after `changeset version` they still held the previous
release's numbers — `@vitus-labs/tools-rolldown@2.6.3` shipped depending on
`@vitus-labs/tools-core@^2.5.0`, two releases behind.

Internal dependencies are now resolved from the versions on disk and pinned
exactly, so every package in a release references exactly its siblings from
that same release.
