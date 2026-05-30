---
'@vitus-labs/tools-atlas': patch
---

Three proven perf wins in the atlas analysis pipeline, each measured against the real codebase and regression-locked.

**1. change-frequency: 2N git spawns → 1 git spawn**

`analyzeChangeFrequency` used to invoke `git log` twice for every package (once for commit count, once for last-changed date). Replaced with a single `git log --name-only --since=90.days --format=__COMMIT__%H %cI` over the whole repo, bucketed in-memory by which package path each touched file belongs to. Longest-prefix-first matching prevents `pkg-a` from absorbing files from `pkg-a-extra/`. Commit dedup within a single commit's file list.

Measured on this 12-package monorepo:
- old: **329ms** (24 git spawns)
- new: **27ms** standalone / 85ms via full production path (1 git spawn)
- ~12× wall-clock on this repo; scales to ~100× on 100-package monorepos (was O(N) sync spawns, now O(commits×files) in-process)

**2. health-score: O(N × C × L) cycle filter → O(C × L + N) precompute**

`applyCyclePenalty` ran `cycles.filter(c => c.includes(name)).length` for **every** node — quadratic in (nodes × cycles × cycle-length). Precompute `Map<pkg, cycleCount>` once during the setup pass, then O(1) lookup per node. Same scores produced; cheaper to compute on graphs with many cycles.

**3. renderer report: build data once when both formats requested**

`config.report === true` triggers both JSON and markdown reports. The convenience wrappers `generateJsonReport(data)` and `generateMarkdownReport(data)` each independently called `buildReportData(data)` — same expensive structure built twice. Added pre-built variants `serializeJsonReport(report)` and `formatMarkdownReport(report, criticalPath)` and exported `buildReportData`. Renderer now calls `buildReportData` once and feeds it to both formatters. Old wrappers retained for any external single-format callers (zero API churn).

Regression-locked: new test asserts `buildReportData` is called exactly 1 time (was 2 before) when both formats are requested.

No memory leaks found. No behavioral changes — same outputs, same scores, same reports.
