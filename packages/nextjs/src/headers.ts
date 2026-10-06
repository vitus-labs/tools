import type { HeadersConfig, SecurityHeader } from './types.ts'

const DEFAULT_HEADERS: SecurityHeader[] = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

const resolveHeaders = (config: HeadersConfig): SecurityHeader[] => {
  if (config === false) return []
  if (config === true) return DEFAULT_HEADERS

  if (typeof config === 'function') return config(DEFAULT_HEADERS)

  // Record — override matching keys (case-insensitive), drop keys set to
  // false/null, append unknown keys as new headers
  const overrides = new Map(
    Object.entries(config).map(([key, value]) => [key.toLowerCase(), value]),
  )
  const defaultKeys = new Set(DEFAULT_HEADERS.map((h) => h.key.toLowerCase()))

  const result: SecurityHeader[] = []
  for (const h of DEFAULT_HEADERS) {
    const override = overrides.get(h.key.toLowerCase())
    if (override === undefined) result.push(h)
    else if (typeof override === 'string')
      result.push({ ...h, value: override })
  }

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && !defaultKeys.has(key.toLowerCase())) {
      result.push({ key, value })
    }
  }

  return result
}

export const securityHeaders = (config: HeadersConfig = true) => {
  const headers = resolveHeaders(config)

  if (headers.length === 0) return []

  return [{ source: '/(.*)', headers }]
}
