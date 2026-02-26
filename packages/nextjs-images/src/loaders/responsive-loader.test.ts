import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
}))

const { mockRequire } = vi.hoisted(() => ({
  mockRequire: vi.fn(),
}))

vi.mock('node:module', () => ({
  createRequire: vi.fn(() => mockRequire),
}))

import type {
  DetectedLoaders,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types'
import {
  applyResponsiveLoader,
  getResponsiveLoaderOptions,
} from './responsive-loader'

const defaultOptimized: OptimizedImagesConfig = {
  optimizeImages: true,
  optimizeImagesInDev: false,
  handleImages: ['jpeg', 'png', 'svg', 'webp', 'gif'],
  imagesFolder: 'images',
  imagesName: '[name]-[hash].[ext]',
  removeOriginalExtension: false,
  inlineImageLimit: 8192,
  defaultImageLoader: 'img-loader',
  mozjpeg: {},
  optipng: {},
  pngquant: {},
  gifsicle: { interlaced: true, optimizationLevel: 3 },
  svgo: { plugins: [{ name: 'removeViewBox', active: false }] },
  svgSpriteLoader: { symbolId: '[name]-[hash:8]' },
  webp: {},
}

const defaultDetectedLoaders: DetectedLoaders = {
  jpeg: false,
  gif: false,
  svg: false,
  svgSprite: false,
  webp: false,
  png: false,
  lqip: false,
  responsive: false,
  responsiveAdapter: false,
}

const createWebpackConfig = (): WebpackConfig => ({
  module: { rules: [] },
})

describe('getResponsiveLoaderOptions', () => {
  it('should return file loader options with responsive name pattern', () => {
    const opts = getResponsiveLoaderOptions(
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    expect(opts.name).toBe('[name]-[width]-[hash].[ext]')
    expect(opts.publicPath).toBe('/_next/static/images/')
    expect(opts.outputPath).toBe('static/images/')
  })

  it('should use server output path when isServer is true', () => {
    const opts = getResponsiveLoaderOptions(
      defaultOptimized,
      {},
      true,
      defaultDetectedLoaders,
    )

    expect(opts.outputPath).toBe('../static/images/')
  })

  it('should not set adapter when no responsive adapter is detected', () => {
    const opts = getResponsiveLoaderOptions(
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    expect(opts.adapter).toBeUndefined()
  })

  it('should load sharp adapter when responsiveAdapter is sharp', () => {
    const mockSharpModule = { sharp: true }
    mockRequire.mockReturnValueOnce(mockSharpModule)

    const loaders: DetectedLoaders = {
      ...defaultDetectedLoaders,
      responsive: '/path/to/responsive-loader',
      responsiveAdapter: 'sharp',
    }

    const opts = getResponsiveLoaderOptions(
      defaultOptimized,
      {},
      false,
      loaders,
    )

    expect(opts.adapter).toBe(mockSharpModule)
  })

  it('should use adapter from responsive config when provided', () => {
    const customAdapter = () => {}
    const config: OptimizedImagesConfig = {
      ...defaultOptimized,
      responsive: { adapter: customAdapter, sizes: [300, 600, 900] },
    }

    const loaders: DetectedLoaders = {
      ...defaultDetectedLoaders,
      responsive: '/path/to/responsive-loader',
      responsiveAdapter: 'sharp',
    }

    const opts = getResponsiveLoaderOptions(config, {}, false, loaders)

    // Custom adapter takes precedence, so mockRequire should NOT be called
    expect(opts.adapter).toBe(customAdapter)
  })

  it('should merge custom responsive config', () => {
    const config: OptimizedImagesConfig = {
      ...defaultOptimized,
      responsive: { sizes: [300, 600, 900], quality: 85 },
    }

    const opts = getResponsiveLoaderOptions(
      config,
      {},
      false,
      defaultDetectedLoaders,
    )

    expect(opts.sizes).toEqual([300, 600, 900])
    expect(opts.quality).toBe(85)
  })

  it('should override name from responsive config', () => {
    const config: OptimizedImagesConfig = {
      ...defaultOptimized,
      responsive: { name: 'custom-[name]-[width].[ext]' },
    }

    const opts = getResponsiveLoaderOptions(
      config,
      {},
      false,
      defaultDetectedLoaders,
    )

    // responsive config spreads after the default name
    expect(opts.name).toBe('custom-[name]-[width].[ext]')
  })
})

describe('applyResponsiveLoader', () => {
  it('should add a rule to webpack config', () => {
    const webpackConfig = createWebpackConfig()
    const result = applyResponsiveLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    expect(result.module?.rules?.length).toBe(1)
  })

  it('should set jpeg/png test regex on the rule', () => {
    const webpackConfig = createWebpackConfig()
    applyResponsiveLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    expect(rule.test).toEqual(/\.(jpe?g|png)$/i)
  })

  it('should use responsive-loader as the loader', () => {
    const webpackConfig = createWebpackConfig()
    applyResponsiveLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]
    const useConfig = oneOf[0].use as Record<string, unknown>

    expect(useConfig.loader).toBe('responsive-loader')
  })

  it('should include responsive loader options in use config', () => {
    const webpackConfig = createWebpackConfig()
    applyResponsiveLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]
    const useConfig = oneOf[0].use as Record<string, unknown>
    const options = useConfig.options as Record<string, unknown>

    expect(options.name).toBe('[name]-[width]-[hash].[ext]')
  })

  it('should return the modified webpack config', () => {
    const webpackConfig = createWebpackConfig()
    const result = applyResponsiveLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      defaultDetectedLoaders,
    )

    expect(result).toBe(webpackConfig)
  })
})
