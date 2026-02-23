import { describe, expect, it } from 'vitest'
import getConfig from './config.js'

describe('getConfig', () => {
  it('should return default config when called without arguments', () => {
    const config = getConfig()

    expect(config.optimizeImages).toBe(true)
    expect(config.optimizeImagesInDev).toBe(false)
    expect(config.handleImages).toEqual(['jpeg', 'png', 'svg', 'webp', 'gif'])
    expect(config.imagesFolder).toBe('images')
    expect(config.imagesName).toBe('[name]-[hash].[ext]')
    expect(config.inlineImageLimit).toBe(8192)
    expect(config.defaultImageLoader).toBe('img-loader')
  })

  it('should have sensible gifsicle defaults', () => {
    const config = getConfig()

    expect(config.gifsicle).toEqual({
      interlaced: true,
      optimizationLevel: 3,
    })
  })

  it('should have svgo defaults with removeViewBox disabled', () => {
    const config = getConfig()

    expect(config.svgo).toEqual({
      plugins: [{ name: 'removeViewBox', active: false }],
    })
  })

  it('should override defaults with provided config', () => {
    const config = getConfig({
      optimizeImages: false,
      inlineImageLimit: 4096,
      imagesFolder: 'custom',
    })

    expect(config.optimizeImages).toBe(false)
    expect(config.inlineImageLimit).toBe(4096)
    expect(config.imagesFolder).toBe('custom')
    // Untouched defaults remain
    expect(config.optimizeImagesInDev).toBe(false)
  })

  it('should return empty objects for optional loader configs', () => {
    const config = getConfig()

    expect(config.mozjpeg).toEqual({})
    expect(config.optipng).toEqual({})
    expect(config.pngquant).toEqual({})
    expect(config.webp).toEqual({})
  })
})
