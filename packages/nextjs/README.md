# @vitus-labs/tools-nextjs

Opinionated [Next.js](https://nextjs.org) configuration wrapper with sensible defaults.

Reads from `vl-tools.config.mjs` and applies security headers, image optimization, and TypeScript defaults.

## Installation

```bash
bun add @vitus-labs/tools-nextjs
```

**Peer dependency:** `next >= 14`

## Usage

Wrap your Next.js config:

```ts
// next.config.ts
import { withVitusLabs } from '@vitus-labs/tools-nextjs'

export default withVitusLabs({
  // standard next.config.ts options still work
  cacheComponents: true,
})
```

A config function `(phase, { defaultConfig }) => config` (sync or async) is
also accepted — `withVitusLabs` then returns a function:

```ts
export default withVitusLabs((phase) => ({
  // phase-dependent options
}))
```

## Configuration

Configure via `vl-tools.config.mjs` (key: `next`):

```js
export default {
  next: {
    // Security headers — see options below (default: true)
    headers: true,
    // Image optimization
    images: {
      remotePatterns: [{ hostname: '*.example.com' }],
      formats: ['image/avif', 'image/webp'],
    },
    // Monorepo transpilation
    transpilePackages: ['@my-org/ui-core', '@my-org/ui-base'],
    // TypeScript (default: { ignoreBuildErrors: false })
    typescript: { ignoreBuildErrors: false },
  },
}
```

## Defaults

### Security headers

Applied to all routes by default:

| Header | Value |
|---|---|
| X-DNS-Prefetch-Control | `on` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `origin-when-cross-origin` |
| X-Frame-Options | `SAMEORIGIN` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |

The `headers` option accepts several forms:

```js
// Enable all defaults
headers: true

// Disable security headers entirely
headers: false

// Override specific header values (others keep their defaults).
// Keys match case-insensitively; unknown keys are added as new headers;
// `false`/`null` removes a default header.
headers: {
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': false,
}

// Full control via callback
headers: (defaults) => defaults.filter(h => h.key !== 'X-Frame-Options')
```

### TypeScript

Build errors are not ignored by default — strict type checking is enforced.

## Exports

| Export | Description |
|---|---|
| `withVitusLabs(config?)` | Wraps a Next.js config object or config function with defaults |
| `securityHeaders()` | Returns the security headers array (for custom use) |
| `NextjsToolsConfig` | TypeScript type for the config shape |

## License

MIT
