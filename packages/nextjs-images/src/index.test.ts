import { describe, expect, it } from 'vitest'

// Test the pure helper functions by importing the module
// and extracting testable behavior through withOptimizedImages

describe('withOptimizedImages', () => {
  it('should be importable', async () => {
    const mod = await import('./index')
    expect(typeof mod.default).toBe('function')
  })

  it('should return a function that accepts nextConfig', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const plugin = withOptimizedImages()

    expect(typeof plugin).toBe('function')
  })

  it('should return config with webpack function', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})

    expect(typeof config.webpack).toBe('function')
  })

  it('should throw when defaultLoaders is missing', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})

    expect(() =>
      config.webpack?.(
        { module: { rules: [] } } as any,
        { dev: false, isServer: false } as any,
      ),
    ).toThrow('not compatible with Next.js versions below 5.0.0')
  })

  it('should preserve existing nextConfig properties', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({
      reactStrictMode: true,
      basePath: '/app',
    } as any)

    expect((config as any).reactStrictMode).toBe(true)
    expect((config as any).basePath).toBe('/app')
  })
})
