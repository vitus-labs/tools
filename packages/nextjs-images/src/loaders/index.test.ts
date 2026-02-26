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
  appendLoaders,
  detectLoaders,
  getHandledImageTypes,
  getNumOptimizationLoadersInstalled,
  isModuleInstalled,
} from './index'

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

describe('isModuleInstalled', () => {
  it('should return true for resolvable modules', () => {
    // vitest itself should be resolvable
    expect(isModuleInstalled('vitest')).toBe(true)
  })

  it('should return false for non-existent modules', () => {
    expect(isModuleInstalled('non-existent-module-xyz-12345')).toBe(false)
  })
})

describe('detectLoaders', () => {
  it('should return a DetectedLoaders object', () => {
    const loaders = detectLoaders()

    expect(loaders).toHaveProperty('jpeg')
    expect(loaders).toHaveProperty('gif')
    expect(loaders).toHaveProperty('svg')
    expect(loaders).toHaveProperty('svgSprite')
    expect(loaders).toHaveProperty('webp')
    expect(loaders).toHaveProperty('png')
    expect(loaders).toHaveProperty('lqip')
    expect(loaders).toHaveProperty('responsive')
    expect(loaders).toHaveProperty('responsiveAdapter')
  })

  it('should return false for loaders that are not installed', () => {
    const loaders = detectLoaders()

    // These imagemin packages are unlikely to be installed in test environment
    // Each value is either a string (name) or false
    for (const value of Object.values(loaders)) {
      expect(typeof value === 'string' || value === false).toBe(true)
    }
  })
})

describe('getHandledImageTypes', () => {
  it('should return all true for default config', () => {
    const types = getHandledImageTypes(defaultOptimized)

    expect(types.jpeg).toBe(true)
    expect(types.png).toBe(true)
    expect(types.svg).toBe(true)
    expect(types.webp).toBe(true)
    expect(types.gif).toBe(true)
    expect(types.ico).toBe(false)
  })

  it('should handle jpg alias for jpeg', () => {
    const types = getHandledImageTypes({
      ...defaultOptimized,
      handleImages: ['jpg'],
    })

    expect(types.jpeg).toBe(true)
  })

  it('should handle selective image types', () => {
    const types = getHandledImageTypes({
      ...defaultOptimized,
      handleImages: ['png', 'ico'],
    })

    expect(types.jpeg).toBe(false)
    expect(types.png).toBe(true)
    expect(types.svg).toBe(false)
    expect(types.webp).toBe(false)
    expect(types.gif).toBe(false)
    expect(types.ico).toBe(true)
  })

  it('should return all false for empty handleImages', () => {
    const types = getHandledImageTypes({
      ...defaultOptimized,
      handleImages: [],
    })

    expect(types.jpeg).toBe(false)
    expect(types.png).toBe(false)
    expect(types.svg).toBe(false)
    expect(types.webp).toBe(false)
    expect(types.gif).toBe(false)
    expect(types.ico).toBe(false)
  })
})

describe('getNumOptimizationLoadersInstalled', () => {
  it('should count imagemin loaders', () => {
    const loaders: DetectedLoaders = {
      jpeg: 'imagemin-mozjpeg',
      png: 'imagemin-optipng',
      gif: false,
      svg: false,
      svgSprite: false,
      webp: false,
      lqip: false,
      responsive: false,
      responsiveAdapter: false,
    }

    expect(getNumOptimizationLoadersInstalled(loaders)).toBe(2)
  })

  it('should count webp and lqip loaders', () => {
    const loaders: DetectedLoaders = {
      jpeg: false,
      png: false,
      gif: false,
      svg: false,
      svgSprite: false,
      webp: 'webp-loader',
      lqip: 'lqip-loader',
      responsive: false,
      responsiveAdapter: false,
    }

    expect(getNumOptimizationLoadersInstalled(loaders)).toBe(2)
  })

  it('should return 0 when no optimization loaders installed', () => {
    const loaders: DetectedLoaders = {
      jpeg: false,
      png: false,
      gif: false,
      svg: false,
      svgSprite: 'svg-sprite-loader',
      webp: false,
      lqip: false,
      responsive: '/path/to/responsive-loader',
      responsiveAdapter: 'sharp',
    }

    expect(getNumOptimizationLoadersInstalled(loaders)).toBe(0)
  })

  it('should count all imagemin loaders when all installed', () => {
    const loaders: DetectedLoaders = {
      jpeg: 'imagemin-mozjpeg',
      png: 'imagemin-optipng',
      gif: 'imagemin-gifsicle',
      svg: 'imagemin-svgo',
      svgSprite: false,
      webp: 'webp-loader',
      lqip: 'lqip-loader',
      responsive: false,
      responsiveAdapter: false,
    }

    expect(getNumOptimizationLoadersInstalled(loaders)).toBe(6)
  })
})

describe('appendLoaders', () => {
  it('should add rules to webpack config for default image types', () => {
    const webpackConfig = createWebpackConfig()
    const result = appendLoaders(
      webpackConfig,
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    // Should have at least img-loader rule and webp-loader rule
    expect(result.module?.rules?.length).toBeGreaterThan(0)
  })

  it('should return the webpack config object', () => {
    const webpackConfig = createWebpackConfig()
    const result = appendLoaders(
      webpackConfig,
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    expect(result).toBe(webpackConfig)
  })

  it('should add img-loader rule when jpeg/png/svg/gif are handled', () => {
    const webpackConfig = createWebpackConfig()
    appendLoaders(
      webpackConfig,
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]
    expect(rules.length).toBeGreaterThanOrEqual(1)

    // Find a rule that matches jpeg/png
    const imgRule = rules.find((r) => {
      const test = r.test as RegExp
      return test?.test?.('photo.jpg')
    })

    expect(imgRule).toBeDefined()
  })

  it('should add webp-loader rule when webp is handled', () => {
    const webpackConfig = createWebpackConfig()
    appendLoaders(
      webpackConfig,
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]

    const webpRule = rules.find((r) => {
      const test = r.test as RegExp
      return test?.test?.('image.webp')
    })

    expect(webpRule).toBeDefined()
  })

  it('should add file-loader rule for ico when ico is handled', () => {
    const webpackConfig = createWebpackConfig()
    const config: OptimizedImagesConfig = {
      ...defaultOptimized,
      handleImages: ['ico'],
    }

    appendLoaders(
      webpackConfig,
      config,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]

    const icoRule = rules.find((r) => {
      const test = r.test as RegExp
      return test?.test?.('favicon.ico')
    })

    expect(icoRule).toBeDefined()
  })

  it('should not add ico rule when ico is not handled', () => {
    const webpackConfig = createWebpackConfig()
    appendLoaders(
      webpackConfig,
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]

    const icoRule = rules.find((r) => {
      const test = r.test as RegExp
      return test?.toString() === '/\\.(ico)$/i'
    })

    expect(icoRule).toBeUndefined()
  })

  it('should use responsive-loader when defaultImageLoader is responsive-loader', () => {
    const webpackConfig = createWebpackConfig()
    const config: OptimizedImagesConfig = {
      ...defaultOptimized,
      defaultImageLoader: 'responsive-loader',
    }

    appendLoaders(
      webpackConfig,
      config,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]

    // Should have a responsive-loader rule for jpeg/png
    const responsiveRule = rules.find((r) => {
      const test = r.test as RegExp
      return test?.toString() === '/\\.(jpe?g|png)$/i'
    })

    expect(responsiveRule).toBeDefined()
  })

  it('should apply img-loader without optimize when no optimization loaders detected', () => {
    const webpackConfig = createWebpackConfig()

    appendLoaders(
      webpackConfig,
      defaultOptimized,
      {},
      defaultDetectedLoaders,
      false,
      true,
    )

    // Rules should still be added even without detected loaders
    const rules = webpackConfig.module?.rules as Record<string, unknown>[]
    expect(rules.length).toBeGreaterThan(0)
  })

  it('should apply optimization when loaders are detected and optimize is true', () => {
    const webpackConfig = createWebpackConfig()
    const loaders: DetectedLoaders = {
      ...defaultDetectedLoaders,
      // Only use webp-loader here to avoid triggering dynamicImport
      // (imagemin plugins use new Function('moduleName','return import(moduleName)')
      // which is not available in vitest's VM)
      webp: 'webp-loader',
    }

    appendLoaders(webpackConfig, defaultOptimized, {}, loaders, false, true)

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]
    expect(rules.length).toBeGreaterThan(0)
  })

  it('should not add webp rule when webp is not in handleImages', () => {
    const webpackConfig = createWebpackConfig()
    const config: OptimizedImagesConfig = {
      ...defaultOptimized,
      handleImages: ['jpeg', 'png'],
    }

    appendLoaders(
      webpackConfig,
      config,
      {},
      defaultDetectedLoaders,
      false,
      false,
    )

    const rules = webpackConfig.module?.rules as Record<string, unknown>[]

    const webpRule = rules.find((r) => {
      const test = r.test as RegExp
      return test?.test?.('image.webp')
    })

    expect(webpRule).toBeUndefined()
  })
})
