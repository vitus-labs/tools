import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DetectedLoaders, OptimizedImagesConfig } from '../types.ts'
import { getImgLoaderOptions, importImageminPlugin } from './img-loader.ts'

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
  gifsicle: {},
  svgo: {},
  svgSpriteLoader: {},
  webp: {},
}

const noLoaders: DetectedLoaders = {
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

describe('importImageminPlugin', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'imagemin-fixture-'))
    const pkg = path.join(dir, 'node_modules', 'imagemin-fake')
    mkdirSync(pkg, { recursive: true })
    writeFileSync(
      path.join(pkg, 'package.json'),
      JSON.stringify({ name: 'imagemin-fake', main: 'index.js' }),
    )
    writeFileSync(
      path.join(pkg, 'index.js'),
      'module.exports = (opts) => ({ plugin: "fake", opts })',
    )
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should resolve from overwriteImageLoaderPaths and pass the OptimizedImagesConfig option', () => {
    const result = importImageminPlugin(
      'imagemin-fake',
      { ...defaultOptimized, fake: { quality: 80 } },
      { overwriteImageLoaderPaths: dir },
    )

    expect(result).toEqual({ plugin: 'fake', opts: { quality: 80 } })
  })

  it('should resolve plugins lazily from getImgLoaderOptions, in order, using config options', () => {
    const { plugins } = getImgLoaderOptions(
      { ...defaultOptimized, fake: { a: 1 } },
      { overwriteImageLoaderPaths: dir },
      { ...noLoaders, jpeg: 'imagemin-fake' },
      true,
    )
    const first = (plugins as () => unknown[])()

    expect(first).toEqual([{ plugin: 'fake', opts: { a: 1 } }])
    // memoized
    expect((plugins as () => unknown[])()).toBe(first)
  })
})
