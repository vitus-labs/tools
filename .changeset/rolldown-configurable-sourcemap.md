---
'@vitus-labs/tools-rolldown': minor
---

Expose `sourcemap` as a configurable option, mirroring rolldown's native `output.sourcemap` API. Previously hardcoded to `true`.

```js
// vl-tools.config.mjs
export default {
  build: {
    sourcemap: 'hidden', // boolean | 'inline' | 'hidden', default: true
  },
}
```

Semantics (verified end-to-end against on-disk artifacts):

| value | `.js.map` file | `sourceMappingURL` comment | inline data URL |
|---|---|---|---|
| `true` (default) | yes | yes | no |
| `'hidden'` | yes | **no** | no |
| `'inline'` | no | yes | yes (base64 embedded) |
| `false` | no | no | no |

Motivating use case: closed-source consumers who want maps for error-reporting services (Sentry, Datadog) without shipping the `sourceMappingURL` comment that leaks source in the deployed bundle — `'hidden'` is the answer.

Default is `true` — existing builds are bit-for-bit unchanged.
