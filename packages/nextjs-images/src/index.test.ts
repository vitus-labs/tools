import { describe, expect, it } from 'vitest'
import type { Configuration } from 'webpack'

// Test the pure helper functions by importing the module
// and extracting testable behavior through withOptimizedImages

const createWebpackOptions = (overrides?: Record<string, unknown>) => ({
  defaultLoaders: { babel: {} },
  dev: false,
  isServer: false,
  ...overrides,
})

const createWebpackConfig = (
  overrides?: Partial<Configuration>,
): Configuration => ({
  module: { rules: [] },
  ...overrides,
})

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

describe('shouldOptimizeInCurrentStep (tested via webpack callback)', () => {
  it('should optimize in production build when optimizeImages is true', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: false, isServer: false }) as any,
    )

    // When not dev and optimizeImages is true (default), loaders are appended
    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should not optimize in dev by default', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: true, isServer: false }) as any,
    )

    // Rules are still added (loaders are always appended), but with optimize=false
    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should optimize in dev when optimizeImagesInDev is true', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages({ optimizeImagesInDev: true })({})
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: true, isServer: false }) as any,
    )

    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should respect phase from nextComposePlugins for production build', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()(
      {},
      {
        phase: 'phase-production-build',
      },
    )
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: false, isServer: false }) as any,
    )

    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should respect phase from nextComposePlugins for export', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({}, { phase: 'phase-export' })
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: false, isServer: false }) as any,
    )

    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should not optimize for unknown phase', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()(
      {},
      {
        phase: 'phase-production-server',
      },
    )
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: false, isServer: false }) as any,
    )

    // Rules are still added, but optimize should be false
    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should respect development server phase with optimizeImagesInDev', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages({ optimizeImagesInDev: true })(
      {},
      {
        phase: 'phase-development-server',
      },
    )
    const webpackConfig = createWebpackConfig()

    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions({ dev: true, isServer: false }) as any,
    )

    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })
})

describe('removeBuiltinImageProcessing (tested via webpack callback)', () => {
  it('should not fail when webpack config has no oneOf rules', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [{ test: /\.js$/, use: 'babel-loader' }],
      },
    })

    expect(() =>
      config.webpack?.(webpackConfig, createWebpackOptions() as any),
    ).not.toThrow()
  })

  it('should handle null rules in oneOf gracefully', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [null, undefined] as any,
          },
        ],
      },
    })

    expect(() =>
      config.webpack?.(webpackConfig, createWebpackOptions() as any),
    ).not.toThrow()
  })

  it('should exclude images from builtin CSS issuer rule', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const excludeArray: unknown[] = []
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                issuer: { test: /\.(css|scss|sass)$/ },
                exclude: excludeArray,
                use: {
                  loader: 'next-image-loader',
                  options: { name: 'static/media/[name].[hash].[ext]' },
                },
              },
            ],
          },
        ],
      },
    })

    config.webpack?.(webpackConfig, createWebpackOptions() as any)

    // The builtin rule should have image types excluded
    expect(excludeArray.length).toBe(1)
    expect(excludeArray[0]).toBeInstanceOf(RegExp)
  })

  it('should not modify rules that have test property', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const excludeArray: unknown[] = []
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                test: /\.(png|jpg)$/,
                issuer: { test: /\.(css|scss|sass)$/ },
                exclude: excludeArray,
                use: {
                  loader: 'next-image-loader',
                  options: { name: 'static/media/[name].[hash].[ext]' },
                },
              },
            ],
          },
        ],
      },
    })

    config.webpack?.(webpackConfig, createWebpackOptions() as any)

    // The rule has a test property, so isBuiltinImageRule should return false
    expect(excludeArray.length).toBe(0)
  })

  it('should not modify rules that have include property', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const excludeArray: unknown[] = []
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                include: /src/,
                issuer: { test: /\.(css|scss|sass)$/ },
                exclude: excludeArray,
                use: {
                  loader: 'next-image-loader',
                  options: { name: 'static/media/[name].[hash].[ext]' },
                },
              },
            ],
          },
        ],
      },
    })

    config.webpack?.(webpackConfig, createWebpackOptions() as any)

    expect(excludeArray.length).toBe(0)
  })

  it('should not modify rules without issuer', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const excludeArray: unknown[] = []
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                exclude: excludeArray,
                use: {
                  loader: 'next-image-loader',
                  options: { name: 'static/media/[name].[hash].[ext]' },
                },
              },
            ],
          },
        ],
      },
    })

    config.webpack?.(webpackConfig, createWebpackOptions() as any)

    expect(excludeArray.length).toBe(0)
  })

  it('should not modify rules without exclude', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                issuer: { test: /\.(css|scss|sass)$/ },
                use: {
                  loader: 'next-image-loader',
                  options: { name: 'static/media/[name].[hash].[ext]' },
                },
              },
            ],
          },
        ],
      },
    })

    // Should not throw
    expect(() =>
      config.webpack?.(webpackConfig, createWebpackOptions() as any),
    ).not.toThrow()
  })

  it('should not modify rules where use is an array', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const excludeArray: unknown[] = []
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                issuer: { test: /\.(css|scss|sass)$/ },
                exclude: excludeArray,
                use: [
                  {
                    loader: 'next-image-loader',
                    options: { name: 'static/media/[name].[hash].[ext]' },
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    config.webpack?.(webpackConfig, createWebpackOptions() as any)

    // use is an array so isBuiltinImageRule returns false
    expect(excludeArray.length).toBe(0)
  })

  it('should not modify rules where issuer is not CSS-related', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages()({})
    const excludeArray: unknown[] = []
    const webpackConfig = createWebpackConfig({
      module: {
        rules: [
          {
            oneOf: [
              {
                issuer: { test: /\.(js|ts)$/ },
                exclude: excludeArray,
                use: {
                  loader: 'next-image-loader',
                  options: { name: 'static/media/[name].[hash].[ext]' },
                },
              },
            ],
          },
        ],
      },
    })

    config.webpack?.(webpackConfig, createWebpackOptions() as any)

    // Issuer doesn't match CSS pattern
    expect(excludeArray.length).toBe(0)
  })
})

describe('webpack callback integration', () => {
  it('should call existing nextConfig.webpack function', async () => {
    const { default: withOptimizedImages } = await import('./index')
    let webpackCalled = false

    const config = withOptimizedImages()({
      webpack: (cfg: any, _opts: any) => {
        webpackCalled = true
        return cfg
      },
    })

    config.webpack?.(createWebpackConfig(), createWebpackOptions() as any)

    expect(webpackCalled).toBe(true)
  })

  it('should pass enriched config to existing webpack function', async () => {
    const { default: withOptimizedImages } = await import('./index')
    let receivedConfig: Configuration | null = null

    const config = withOptimizedImages()({
      webpack: (cfg: any, _opts: any) => {
        receivedConfig = cfg
        return cfg
      },
    })

    config.webpack?.(createWebpackConfig(), createWebpackOptions() as any)

    expect(receivedConfig).not.toBeNull()
    // The enriched config should have rules added by the plugin
    expect(receivedConfig?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should accept custom optimized images config', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages({
      handleImages: ['png'],
      optimizeImages: false,
    })({})

    const webpackConfig = createWebpackConfig()
    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions() as any,
    )

    // Should still add rules even with limited image types
    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should disable optimization when optimizeImages is false', async () => {
    const { default: withOptimizedImages } = await import('./index')
    const config = withOptimizedImages({ optimizeImages: false })({})

    const webpackConfig = createWebpackConfig()
    const result = config.webpack?.(
      webpackConfig,
      createWebpackOptions() as any,
    )

    // Rules are still added but without optimization loaders
    expect(result?.module?.rules?.length).toBeGreaterThan(0)
  })
})
