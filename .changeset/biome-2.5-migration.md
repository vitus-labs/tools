---
'@vitus-labs/tools-lint': minor
---

Migrate biome config to 2.5 schema. Bumps `@biomejs/biome` devDep to `~2.5.1` and updates the shared `biome.shared.json`.

**Breaking schema changes addressed:**
- `$schema` URL bumped 2.4.7 → 2.5.1
- `linter.rules.recommended: true` → `linter.rules.preset: "recommended"` (the old field is still accepted but deprecated and will be removed in the next major)
- `nursery.noShadow` rule promoted to `suspicious.noShadow` (same diagnostic, new group — confirmed by `biome explain noShadow`)

**Same effective lint coverage** as 2.4: 0 errors / 0 warnings on the 142 files this repo lints, identical rule set, identical custom severities. The `biome migrate` CLI was partially useful (bumped the root `$schema`) but didn't touch the shared config (filename match issue) and on a second run injected an unwanted `"root": false` — applied manually instead.

**For consumers of `@vitus-labs/tools-lint`**: the shipped `biome.shared.json` now uses 2.5 schema syntax (`preset`, no `nursery.noShadow`). Consumers must be on `@biomejs/biome` ≥ 2.5 to use it — biome 2.4 would error on the `preset` key. Hence the minor bump.
