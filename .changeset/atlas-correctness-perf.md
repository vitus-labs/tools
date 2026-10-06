---
'@vitus-labs/tools-atlas': patch
---

Fix correctness and performance issues in atlas.

- Change frequency now works when run from a subdirectory (paths resolved against the git toplevel; `core.quotepath=off`).
- Workspace patterns are resolved with `tinyglobby`: explicit paths, `packages/*/x`, `**` and `!negated` patterns now work.
- Duplicate edges (one per dep type) are merged into a single edge with `depTypes`; edge counts and distributions no longer inflate.
- HTML report escapes the title and embedded data (no `</script>` breakout); SRI `integrity` is only emitted for the default echarts URL.
- Unknown `--report` / `--dep-types` values are rejected; all report files written are logged.
- `bundle-size` no longer zeroes a directory on one bad entry and does not follow symlinks.
- BFS queues are O(n); transitive size and version drift reuse cached data.
- Behavior change: `--include` / `--exclude` patterns without `*` are now exact package-name matches (previously substring matches, so `--exclude core` removed every package containing "core").
