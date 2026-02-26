import type { HeadersConfig, SecurityHeader } from './types'

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

  // Record<string, string> — override matching keys, keep the rest
  return DEFAULT_HEADERS.map((h) => {
    const override = config[h.key]
    return override !== undefined ? { ...h, value: override } : h
  })
}

export const securityHeaders = (config: HeadersConfig = true) => {
  const headers = resolveHeaders(config)

  if (headers.length === 0) return []

  return [{ source: '/(.*)', headers }]
}
