import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
}))

import type { NextConfig, OptimizedImagesConfig } from '../types'
import { getUrlLoaderOptions } from './url-loader'

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

describe('getUrlLoaderOptions', () => {
  it('should return correct default limit of 8192', () => {
    const opts = getUrlLoaderOptions(defaultOptimized, {}, false)

    expect(opts.limit).toBe(8192)
  })

  it('should return custom limit when inlineImageLimit is overridden', () => {
    const opts = getUrlLoaderOptions(
      { ...defaultOptimized, inlineImageLimit: 4096 },
      {},
      false,
    )

    expect(opts.limit).toBe(4096)
  })

  it('should return zero limit', () => {
    const opts = getUrlLoaderOptions(
      { ...defaultOptimized, inlineImageLimit: 0 },
      {},
      false,
    )

    expect(opts.limit).toBe(0)
  })

  it('should set a fallback path as a string', () => {
    const opts = getUrlLoaderOptions(defaultOptimized, {}, false)

    expect(typeof opts.fallback).toBe('string')
    expect(opts.fallback.length).toBeGreaterThan(0)
  })

  it('should include file loader options (publicPath, outputPath, name)', () => {
    const opts = getUrlLoaderOptions(defaultOptimized, {}, false)

    expect(opts.publicPath).toBe('/_next/static/images/')
    expect(opts.outputPath).toBe('static/images/')
    expect(opts.name).toBe('[name]-[hash].[ext]')
  })

  it('should use server output path when isServer is true', () => {
    const opts = getUrlLoaderOptions(defaultOptimized, {}, true)

    expect(opts.outputPath).toBe('../static/images/')
  })

  it('should incorporate assetPrefix from nextConfig', () => {
    const nextConfig: NextConfig = { assetPrefix: 'https://cdn.example.com' }
    const opts = getUrlLoaderOptions(defaultOptimized, nextConfig, false)

    expect(opts.publicPath).toBe('https://cdn.example.com/_next/static/images/')
  })

  it('should use custom imagesPublicPath when provided', () => {
    const opts = getUrlLoaderOptions(
      { ...defaultOptimized, imagesPublicPath: '/custom/path/' },
      {},
      false,
    )

    expect(opts.publicPath).toBe('/custom/path/')
  })
})
