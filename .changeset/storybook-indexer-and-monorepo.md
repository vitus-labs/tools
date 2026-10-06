---
'@vitus-labs/tools-storybook': patch
---

Fix several storybook package bugs: standard CSF stories are no longer dropped by the manual indexer (it now delegates to the default indexers); monorepo mode (`vl_stories-monorepo*`) now actually activates; auto-discovery is an explicit opt-in (`autoDiscovery`) that adds the index globs it needs; `ui.theme` now drives the manager theme; `backgrounds.default` is mapped to the Storybook 10 `backgrounds` global; virtual stories use a `.tsx` id and escape interpolated names; `configDir` uses `fileURLToPath`; the next/font mock uses Vite 8 `optimizeDeps.rolldownOptions`; package `types`/`exports` now resolve typings; unused `@storybook/react-native` dependency removed.
