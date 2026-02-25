import { describe, expect, it } from 'vitest'
import type { NextConfig, OptimizedImagesConfig } from '../types'
import { getFileLoaderOptions } from './file-loader'

const defaultOptimized: Pick<
  OptimizedImagesConfig,
  'imagesPublicPath' | 'imagesOutputPath' | 'imagesFolder' | 'imagesName'
> = {
  imagesFolder: 'images',
  imagesName: '[name]-[hash].[ext]',
  imagesPublicPath: undefined,
  imagesOutputPath: undefined,
}

describe('getFileLoaderOptions', () => {
  it('should return default public path', () => {
    const opts = getFileLoaderOptions(defaultOptimized, {}, false)

    expect(opts.publicPath).toBe('/_next/static/images/')
    expect(opts.name).toBe('[name]-[hash].[ext]')
  })

  it('should use custom imagesPublicPath when provided', () => {
    const opts = getFileLoaderOptions(
      { ...defaultOptimized, imagesPublicPath: '/cdn/images/' },
      {},
      false,
    )

    expect(opts.publicPath).toBe('/cdn/images/')
  })

  it('should incorporate assetPrefix', () => {
    const opts = getFileLoaderOptions(
      defaultOptimized,
      { assetPrefix: 'https://cdn.example.com' } as NextConfig,
      false,
    )

    expect(opts.publicPath).toBe('https://cdn.example.com/_next/static/images/')
  })

  it('should handle assetPrefix with trailing slash', () => {
    const opts = getFileLoaderOptions(
      defaultOptimized,
      { assetPrefix: 'https://cdn.example.com/' } as NextConfig,
      false,
    )

    expect(opts.publicPath).toBe('https://cdn.example.com/_next/static/images/')
  })

  it('should set server output path with ../ prefix', () => {
    const opts = getFileLoaderOptions(defaultOptimized, {}, true)

    expect(opts.outputPath).toBe('../static/images/')
  })

  it('should set client output path without ../ prefix', () => {
    const opts = getFileLoaderOptions(defaultOptimized, {}, false)

    expect(opts.outputPath).toBe('static/images/')
  })

  it('should use custom imagesOutputPath when provided', () => {
    const opts = getFileLoaderOptions(
      { ...defaultOptimized, imagesOutputPath: 'custom/path/' },
      {},
      false,
    )

    expect(opts.outputPath).toBe('custom/path/')
  })
})
