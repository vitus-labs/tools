---
'@vitus-labs/tools-rolldown': minor
---

External package names now also match deep imports. Listing `echarts` as an external automatically externalizes `echarts/core`, `echarts/charts/BarChart`, etc. — no need to enumerate every subpath.

This applies to both `package.json` dependencies/peerDependencies (auto-externalized) and entries in `CONFIG.external`. Users who need granular control can still pass a `RegExp` directly in `CONFIG.external` — it will be used as-is.

**Behavior change**: previously, only exact-match strings were externalized. If you relied on a package's deep imports being bundled while the bare import was external, you'll need to handle that explicitly now.
