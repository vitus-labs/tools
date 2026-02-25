import { describe, expect, it } from 'vitest'
import { securityHeaders } from './headers'

describe('securityHeaders', () => {
  it('should return headers for all routes', () => {
    const result = securityHeaders()
    expect(result).toHaveLength(1)
    expect(result[0]?.source).toBe('/(.*)')
  })

  it('should include all security headers', () => {
    const headers = securityHeaders()[0]?.headers ?? []
    const keys = headers.map((h) => h.key)

    expect(keys).toContain('X-DNS-Prefetch-Control')
    expect(keys).toContain('Strict-Transport-Security')
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('Referrer-Policy')
    expect(keys).toContain('X-Frame-Options')
    expect(keys).toContain('Permissions-Policy')
  })

  it('should have HSTS with long max-age and preload', () => {
    const headers = securityHeaders()[0]?.headers ?? []
    const hsts = headers.find((h) => h.key === 'Strict-Transport-Security')

    expect(hsts?.value).toContain('max-age=63072000')
    expect(hsts?.value).toContain('includeSubDomains')
    expect(hsts?.value).toContain('preload')
  })

  it('should return empty array when disabled', () => {
    expect(securityHeaders(false)).toEqual([])
  })

  it('should override specific headers via object', () => {
    const result = securityHeaders({
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    })
    const headers = result[0]?.headers ?? []
    const pp = headers.find((h) => h.key === 'Permissions-Policy')

    expect(pp?.value).toBe('camera=(self), microphone=(), geolocation=()')
    expect(headers).toHaveLength(6)
  })

  it('should leave non-overridden headers unchanged', () => {
    const result = securityHeaders({ 'X-Frame-Options': 'DENY' })
    const headers = result[0]?.headers ?? []
    const xfo = headers.find((h) => h.key === 'X-Frame-Options')
    const hsts = headers.find((h) => h.key === 'Strict-Transport-Security')

    expect(xfo?.value).toBe('DENY')
    expect(hsts?.value).toContain('max-age=63072000')
  })

  it('should support callback for full control', () => {
    const result = securityHeaders((defaults) => [
      ...defaults.filter((h) => h.key !== 'X-Frame-Options'),
      { key: 'X-Custom', value: 'test' },
    ])
    const headers = result[0]?.headers ?? []
    const keys = headers.map((h) => h.key)

    expect(keys).not.toContain('X-Frame-Options')
    expect(keys).toContain('X-Custom')
  })

  it('should return empty array when callback returns empty', () => {
    expect(securityHeaders(() => [])).toEqual([])
  })
})
