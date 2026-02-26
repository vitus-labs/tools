import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
}))

import type {
  DetectedLoaders,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types'
import {
  applyWebpLoader,
  getWebpLoaderOptions,
  getWebpResourceQuery,
} from './webp-loader'

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
  webp: 'webp-loader',
  png: false,
  lqip: false,
  responsive: false,
  responsiveAdapter: false,
}

const createWebpackConfig = (): WebpackConfig => ({
  module: { rules: [] },
})

describe('getWebpLoaderOptions', () => {
  it('should return empty object when webp config is empty', () => {
    expect(getWebpLoaderOptions({ webp: {} })).toEqual({})
  })

  it('should pass through webp config options', () => {
    const result = getWebpLoaderOptions({ webp: { quality: 80, method: 4 } })

    expect(result).toEqual({ quality: 80, method: 4 })
  })
})

describe('applyWebpLoader', () => {
  it('should add a rule to webpack config', () => {
    const webpackConfig = createWebpackConfig()
    const result = applyWebpLoader(
      webpackConfig,
      defaultOptimized,
      {},
      true,
      false,
      defaultDetectedLoaders,
    )

    expect(result.module?.rules?.length).toBe(1)
  })

  it('should add webp test regex to rule', () => {
    const webpackConfig = createWebpackConfig()
    applyWebpLoader(
      webpackConfig,
      defaultOptimized,
      {},
      true,
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    expect(rule.test).toEqual(/\.webp$/i)
  })

  it('should include webp-loader when optimize is true', () => {
    const webpackConfig = createWebpackConfig()
    applyWebpLoader(
      webpackConfig,
      defaultOptimized,
      {},
      true,
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]
    // The last entry in oneOf is the default use array
    const defaultEntry = oneOf[oneOf.length - 1]
    const loaders = defaultEntry.use as Array<{ loader: string }>

    expect(loaders.length).toBe(2)
    expect(loaders[0].loader).toBe('url-loader')
    expect(loaders[1].loader).toBe('webp-loader')
  })

  it('should exclude webp-loader when optimize is false', () => {
    const webpackConfig = createWebpackConfig()
    applyWebpLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]
    const defaultEntry = oneOf[oneOf.length - 1]
    const loaders = defaultEntry.use as Array<{ loader: string }>

    expect(loaders.length).toBe(1)
    expect(loaders[0].loader).toBe('url-loader')
  })

  it('should include resource queries in oneOf', () => {
    const webpackConfig = createWebpackConfig()
    applyWebpLoader(
      webpackConfig,
      defaultOptimized,
      {},
      true,
      false,
      defaultDetectedLoaders,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]

    // Should have resource queries plus the default loader entry
    expect(oneOf.length).toBeGreaterThan(1)
  })
})

describe('getWebpResourceQuery', () => {
  it('should return a resourceQuery regex matching webp', () => {
    const result = getWebpResourceQuery(defaultOptimized, {}, false)

    expect(result.resourceQuery).toEqual(/webp/)
  })

  it('should include url-loader and webp-loader in use array', () => {
    const result = getWebpResourceQuery(defaultOptimized, {}, false)

    expect(result.use.length).toBe(2)
    expect(result.use[0].loader).toBe('url-loader')
    expect(result.use[1].loader).toBe('webp-loader')
  })

  it('should replace [ext] with [ext].webp when removeOriginalExtension is false', () => {
    const result = getWebpResourceQuery(defaultOptimized, {}, false)

    expect(result.use[0].options?.name).toBe('[name]-[hash].[ext].webp')
  })

  it('should replace [ext] with webp when removeOriginalExtension is true', () => {
    const config = { ...defaultOptimized, removeOriginalExtension: true }
    const result = getWebpResourceQuery(config, {}, false)

    expect(result.use[0].options?.name).toBe('[name]-[hash].webp')
  })

  it('should append .webp when name does not contain [ext]', () => {
    const config = {
      ...defaultOptimized,
      imagesName: '[name]-[hash].png',
    }
    const result = getWebpResourceQuery(config, {}, false)

    expect(result.use[0].options?.name).toBe('[name]-[hash].png.webp')
  })

  it('should set mimetype to image/webp', () => {
    const result = getWebpResourceQuery(defaultOptimized, {}, false)

    expect(result.use[0].options?.mimetype).toBe('image/webp')
  })

  it('should pass webp loader options to webp-loader', () => {
    const config = { ...defaultOptimized, webp: { quality: 75 } }
    const result = getWebpResourceQuery(config, {}, false)

    expect(result.use[1].options).toEqual({ quality: 75 })
  })
})
