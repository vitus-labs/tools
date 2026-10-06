import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
}))

import type {
  DetectedLoaders,
  HandledImageTypes,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.ts'
import {
  applyImgLoader,
  getHandledFilesRegex,
  getImgLoaderOptions,
} from './img-loader.ts'

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

const allImageTypes: HandledImageTypes = {
  jpeg: true,
  png: true,
  svg: true,
  webp: true,
  gif: true,
  ico: false,
}

const createWebpackConfig = (): WebpackConfig => ({
  module: { rules: [] },
})

describe('getHandledFilesRegex', () => {
  it('should match jpeg files when jpeg is enabled', () => {
    const regex = getHandledFilesRegex({
      jpeg: true,
      png: false,
      svg: false,
      webp: false,
      gif: false,
      ico: false,
    })

    expect(regex.test('photo.jpg')).toBe(true)
    expect(regex.test('photo.jpeg')).toBe(true)
    expect(regex.test('photo.JPG')).toBe(true)
  })

  it('should match png files when png is enabled', () => {
    const regex = getHandledFilesRegex({
      jpeg: false,
      png: true,
      svg: false,
      webp: false,
      gif: false,
      ico: false,
    })

    expect(regex.test('image.png')).toBe(true)
    expect(regex.test('image.PNG')).toBe(true)
    expect(regex.test('photo.jpg')).toBe(false)
  })

  it('should match svg files when svg is enabled', () => {
    const regex = getHandledFilesRegex({
      jpeg: false,
      png: false,
      svg: true,
      webp: false,
      gif: false,
      ico: false,
    })

    expect(regex.test('icon.svg')).toBe(true)
    expect(regex.test('image.png')).toBe(false)
  })

  it('should match gif files when gif is enabled', () => {
    const regex = getHandledFilesRegex({
      jpeg: false,
      png: false,
      svg: false,
      webp: false,
      gif: true,
      ico: false,
    })

    expect(regex.test('animation.gif')).toBe(true)
    expect(regex.test('image.png')).toBe(false)
  })

  it('should match all enabled types', () => {
    const regex = getHandledFilesRegex({
      jpeg: true,
      png: true,
      svg: true,
      webp: false,
      gif: true,
      ico: false,
    })

    expect(regex.test('photo.jpg')).toBe(true)
    expect(regex.test('photo.jpeg')).toBe(true)
    expect(regex.test('image.png')).toBe(true)
    expect(regex.test('icon.svg')).toBe(true)
    expect(regex.test('animation.gif')).toBe(true)
    expect(regex.test('image.webp')).toBe(false)
  })

  it('should not match webp or ico (not handled by img-loader regex)', () => {
    const regex = getHandledFilesRegex({
      jpeg: false,
      png: false,
      svg: false,
      webp: true,
      gif: false,
      ico: true,
    })

    // webp and ico are not included in the regex builder
    expect(regex.test('image.webp')).toBe(false)
    expect(regex.test('icon.ico')).toBe(false)
  })
})

describe('getImgLoaderOptions', () => {
  it('should return empty plugins array when optimize is false', () => {
    const result = getImgLoaderOptions(
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
    )

    expect(result).toEqual({ plugins: [] })
  })

  it('should never return a promise (webpack does not await options)', () => {
    const loaders: DetectedLoaders = {
      ...defaultDetectedLoaders,
      jpeg: 'imagemin-mozjpeg',
    }

    for (const optimize of [true, false]) {
      const result = getImgLoaderOptions(
        defaultOptimized,
        {},
        loaders,
        optimize,
      )
      expect(typeof (result as unknown as { then?: unknown }).then).toBe(
        'undefined',
      )
    }
  })

  it('should return a lazy plugins function that img-loader can call synchronously', () => {
    const result = getImgLoaderOptions(
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      true,
    )

    expect(typeof result.plugins).toBe('function')
    expect((result.plugins as () => unknown[])()).toEqual([])
  })

  it('should throw a clear error when a detected plugin cannot be resolved', () => {
    const loaders: DetectedLoaders = {
      ...defaultDetectedLoaders,
      jpeg: 'imagemin-does-not-exist-xyz',
    }
    const { plugins } = getImgLoaderOptions(defaultOptimized, {}, loaders, true)

    expect(() => (plugins as () => unknown[])()).toThrow(/Cannot find module/)
  })
})

describe('applyImgLoader', () => {
  it('should add a rule to webpack config', () => {
    const webpackConfig = createWebpackConfig()
    const result = applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
      allImageTypes,
    )

    expect(result.module?.rules?.length).toBe(1)
  })

  it('should set the correct test regex based on handled image types', () => {
    const webpackConfig = createWebpackConfig()
    applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
      allImageTypes,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const testRegex = rule.test as RegExp

    expect(testRegex.test('photo.jpg')).toBe(true)
    expect(testRegex.test('photo.jpeg')).toBe(true)
    expect(testRegex.test('image.png')).toBe(true)
    expect(testRegex.test('icon.svg')).toBe(true)
    expect(testRegex.test('animation.gif')).toBe(true)
  })

  it('should include url-loader and img-loader in default use', () => {
    const webpackConfig = createWebpackConfig()
    applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
      allImageTypes,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]
    // The last entry in oneOf is the default (url-loader + img-loader)
    const defaultEntry = oneOf[oneOf.length - 1]
    const loaders = defaultEntry.use as Array<{ loader: string }>

    expect(loaders[0].loader).toContain('url-loader')
    expect(loaders[1].loader).toContain('img-loader')
  })

  it('should include webp resource query when webp is handled', () => {
    const webpackConfig = createWebpackConfig()
    applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
      allImageTypes,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]

    const webpQuery = oneOf.find((entry) => {
      const rq = entry.resourceQuery as RegExp | undefined
      return rq?.test('?webp') === true
    })

    expect(webpQuery).toBeDefined()
  })

  it('should not include webp resource query when webp is not handled', () => {
    const webpackConfig = createWebpackConfig()
    const noWebpTypes: HandledImageTypes = {
      ...allImageTypes,
      webp: false,
    }

    applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
      noWebpTypes,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]

    const webpQuery = oneOf.find((entry) => {
      const rq = entry.resourceQuery as RegExp | undefined
      return rq?.test('?webp') === true
    })

    expect(webpQuery).toBeUndefined()
  })

  it('should include svg sprite query when svgSprite loader is detected', () => {
    const webpackConfig = createWebpackConfig()
    const loaders: DetectedLoaders = {
      ...defaultDetectedLoaders,
      svgSprite: 'svg-sprite-loader',
    }

    applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      loaders,
      allImageTypes,
    )

    const rule = webpackConfig.module?.rules?.[0] as Record<string, unknown>
    const oneOf = rule.oneOf as Record<string, unknown>[]

    const spriteQuery = oneOf.find((entry) => {
      const rq = entry.resourceQuery as RegExp | undefined
      return rq?.test('?sprite') === true
    })

    expect(spriteQuery).toBeDefined()
  })

  it('should return the modified webpack config', () => {
    const webpackConfig = createWebpackConfig()
    const result = applyImgLoader(
      webpackConfig,
      defaultOptimized,
      {},
      false,
      false,
      defaultDetectedLoaders,
      allImageTypes,
    )

    expect(result).toBe(webpackConfig)
  })
})
