import { describe, expect, it } from 'vitest'
import type { DetectedLoaders, OptimizedImagesConfig } from '../types.js'
import {
  getHandledImageTypes,
  getNumOptimizationLoadersInstalled,
} from './index.js'
import { getHandledFilesRegex } from './img-loader.js'
import { getImageTraceLoaderOptions } from './image-trace-loader.js'
import { getWebpLoaderOptions } from './webp-loader.js'

const defaultConfig = {
  handleImages: ['jpeg', 'png', 'svg', 'webp', 'gif'],
} as OptimizedImagesConfig

describe('getHandledImageTypes', () => {
  it('should return all true for default config', () => {
    const types = getHandledImageTypes(defaultConfig)

    expect(types.jpeg).toBe(true)
    expect(types.png).toBe(true)
    expect(types.svg).toBe(true)
    expect(types.webp).toBe(true)
    expect(types.gif).toBe(true)
    expect(types.ico).toBe(false)
  })

  it('should handle jpg alias for jpeg', () => {
    const types = getHandledImageTypes({
      handleImages: ['jpg'],
    } as OptimizedImagesConfig)

    expect(types.jpeg).toBe(true)
  })

  it('should handle selective image types', () => {
    const types = getHandledImageTypes({
      handleImages: ['png', 'ico'],
    } as OptimizedImagesConfig)

    expect(types.jpeg).toBe(false)
    expect(types.png).toBe(true)
    expect(types.svg).toBe(false)
    expect(types.ico).toBe(true)
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
})

describe('getHandledFilesRegex', () => {
  it('should match jpeg and png when enabled', () => {
    const regex = getHandledFilesRegex({
      jpeg: true,
      png: true,
      svg: false,
      webp: false,
      gif: false,
      ico: false,
    })

    expect(regex.test('photo.jpg')).toBe(true)
    expect(regex.test('photo.jpeg')).toBe(true)
    expect(regex.test('image.png')).toBe(true)
    expect(regex.test('icon.svg')).toBe(false)
  })

  it('should match all image types when all enabled', () => {
    const regex = getHandledFilesRegex({
      jpeg: true,
      png: true,
      svg: true,
      webp: false,
      gif: true,
      ico: false,
    })

    expect(regex.test('photo.jpg')).toBe(true)
    expect(regex.test('image.png')).toBe(true)
    expect(regex.test('icon.svg')).toBe(true)
    expect(regex.test('anim.gif')).toBe(true)
  })
})

describe('getImageTraceLoaderOptions', () => {
  it('should return empty object when no config', () => {
    expect(getImageTraceLoaderOptions({} as OptimizedImagesConfig)).toEqual({})
  })

  it('should pass through imageTrace config', () => {
    const opts = getImageTraceLoaderOptions({
      imageTrace: { color: '#fff', threshold: 120 },
    } as OptimizedImagesConfig)

    expect(opts).toEqual({ color: '#fff', threshold: 120 })
  })
})

describe('getWebpLoaderOptions', () => {
  it('should return empty object when no webp config', () => {
    expect(getWebpLoaderOptions({ webp: {} })).toEqual({})
  })

  it('should pass through webp config', () => {
    expect(getWebpLoaderOptions({ webp: { quality: 80 } })).toEqual({
      quality: 80,
    })
  })
})
