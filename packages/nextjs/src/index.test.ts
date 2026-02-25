import { describe, expect, it, vi } from 'vitest'

vi.mock('./config/index', () => ({
  CONFIG: {
    headers: true,
    images: { formats: ['image/avif', 'image/webp'] },
    transpilePackages: ['@my-org/shared'],
    typescript: { ignoreBuildErrors: false },
  },
}))

import { withVitusLabs } from './index'

describe('withVitusLabs', () => {
  it('should return a config object', () => {
    const config = withVitusLabs()
    expect(config).toBeDefined()
  })

  it('should merge images from CONFIG', () => {
    const config = withVitusLabs()
    expect(config.images).toEqual({
      formats: ['image/avif', 'image/webp'],
    })
  })

  it('should allow user to override images', () => {
    const config = withVitusLabs({
      images: { formats: ['image/webp'] },
    })
    expect(config.images?.formats).toEqual(['image/webp'])
  })

  it('should merge transpilePackages from CONFIG and user', () => {
    const config = withVitusLabs({
      transpilePackages: ['@my-org/ui'],
    })
    expect(config.transpilePackages).toEqual(['@my-org/shared', '@my-org/ui'])
  })

  it('should set typescript defaults', () => {
    const config = withVitusLabs()
    expect(config.typescript?.ignoreBuildErrors).toBe(false)
  })

  it('should add security headers by default', async () => {
    const config = withVitusLabs()
    const headers = await config.headers?.()
    expect(headers).toBeDefined()
    expect(headers?.length).toBeGreaterThan(0)
    expect(headers?.[0]?.source).toBe('/(.*)')
  })

  it('should append user headers after security headers', async () => {
    const userHeader = {
      source: '/api/(.*)',
      headers: [{ key: 'X-Custom', value: 'test' }],
    }
    const config = withVitusLabs({
      headers: async () => [userHeader],
    })
    const headers = await config.headers?.()

    expect(headers).toHaveLength(2)
    expect(headers?.[0]?.source).toBe('/(.*)')
    expect(headers?.[1]?.source).toBe('/api/(.*)')
  })

  it('should apply header overrides from config object', async () => {
    vi.doMock('./config/index', () => ({
      CONFIG: {
        headers: { 'Permissions-Policy': 'camera=(self)' },
        images: {},
        transpilePackages: [],
        typescript: {},
      },
    }))

    vi.resetModules()
    const { withVitusLabs: withVL } = await import('./index')

    const config = withVL()
    const headers = await config.headers?.()
    const pp = headers?.[0]?.headers.find(
      (h: any) => h.key === 'Permissions-Policy',
    )

    expect(pp?.value).toBe('camera=(self)')
  })

  it('should skip security headers when disabled', async () => {
    vi.doMock('./config/index', () => ({
      CONFIG: {
        headers: false,
        images: {},
        transpilePackages: [],
        typescript: {},
      },
    }))

    vi.resetModules()
    const { withVitusLabs: withVL } = await import('./index')

    const userHeader = {
      source: '/api/(.*)',
      headers: [{ key: 'X-Custom', value: 'test' }],
    }
    const config = withVL({ headers: async () => [userHeader] })
    const headers = await config.headers?.()

    expect(headers).toHaveLength(1)
    expect(headers?.[0]?.source).toBe('/api/(.*)')
  })

  it('should preserve user config properties', () => {
    const config = withVitusLabs({
      experimental: { ppr: true },
    })
    expect((config as any).experimental?.ppr).toBe(true)
  })
})
