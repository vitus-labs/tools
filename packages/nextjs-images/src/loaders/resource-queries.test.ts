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
  NextConfig,
  OptimizedImagesConfig,
} from '../types.ts'
import { getResourceQueries } from './resource-queries.ts'

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

describe('getResourceQueries', () => {
  it('should return an array of resource query entries', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    expect(Array.isArray(queries)).toBe(true)
    expect(queries.length).toBeGreaterThan(0)
  })

  it('should return entries with resourceQuery regex and use array', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    for (const query of queries) {
      expect(query.resourceQuery).toBeInstanceOf(RegExp)
      expect(Array.isArray(query.use)).toBe(true)
      expect(query.use.length).toBeGreaterThan(0)
    }
  })

  it('should include optimizer loader for optimize=true queries when optimizerLoaderName is set', () => {
    const optimizerOptions = { plugins: [] }
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      optimizerOptions,
      defaultDetectedLoaders,
    )

    // Find the ?url query (which has optimize: true)
    const urlQuery = queries.find((q) =>
      q.resourceQuery.toString().includes('url'),
    )

    expect(urlQuery).toBeDefined()

    // The ?url query should have the optimizer loader appended
    // But the combination ?url&original has optimize=false, so we need the pure ?url
    const pureUrlQuery = queries.find(
      (q) =>
        q.resourceQuery.toString().includes('url') &&
        !q.resourceQuery.toString().includes('original'),
    )

    if (pureUrlQuery) {
      const hasOptimizer = pureUrlQuery.use.some(
        (u) => u.loader === 'img-loader',
      )
      expect(hasOptimizer).toBe(true)
    }
  })

  it('should not include optimizer loader when optimizerLoaderName is null', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      null,
      {},
      defaultDetectedLoaders,
    )

    for (const query of queries) {
      // No entry should have the img-loader as optimizer
      // (it might exist as a regular loader for some queries, but not as optimizer)
      const lastLoader = query.use[query.use.length - 1]
      expect(lastLoader.loader).not.toBe('img-loader')
    }
  })

  it('should include ?original query', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    const originalQuery = queries.find(
      (q) => q.resourceQuery.test('?original') && !q.resourceQuery.test('?url'),
    )

    expect(originalQuery).toBeDefined()
  })

  it('should include ?inline query with limit undefined in options', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    // combinations come first, so the first match for a bare query is the pure one
    const inlineQuery = queries.find((q) => q.resourceQuery.test('?inline'))

    expect(inlineQuery).toBeDefined()

    if (inlineQuery) {
      const urlLoader = inlineQuery.use.find((u) =>
        u.loader.includes('url-loader'),
      )
      expect(urlLoader).toBeDefined()
      expect(urlLoader?.options?.limit).toBeUndefined()
    }
  })

  it('should include ?include query with raw-loader', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    // combinations come first, so the first match for a bare query is the pure one
    const includeQuery = queries.find((q) => q.resourceQuery.test('?include'))

    expect(includeQuery).toBeDefined()

    if (includeQuery) {
      const rawLoader = includeQuery.use.find((u) =>
        u.loader.includes('raw-loader'),
      )
      expect(rawLoader).toBeDefined()
    }
  })

  it('should include ?size query with responsive-loader', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    const sizeQuery = queries.find((q) => q.resourceQuery.test('?size=300'))

    expect(sizeQuery).toBeDefined()

    if (sizeQuery) {
      const responsiveLoader = sizeQuery.use.find(
        (u) => u.loader === 'responsive-loader',
      )
      expect(responsiveLoader).toBeDefined()
    }
  })

  it('should include combination queries for ?url&original', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      'img-loader',
      {},
      defaultDetectedLoaders,
    )

    const combinationQuery = queries.find(
      (q) =>
        q.resourceQuery.test('?url&original') &&
        q.resourceQuery.test('?original&url'),
    )

    expect(combinationQuery).toBeDefined()
  })

  it('should set url-loader options from config', () => {
    const queries = getResourceQueries(
      defaultOptimized,
      {},
      false,
      null,
      {},
      defaultDetectedLoaders,
    )

    // Find any query that uses url-loader
    const queryWithUrlLoader = queries.find((q) =>
      q.use.some((u) => u.loader.includes('url-loader')),
    )

    expect(queryWithUrlLoader).toBeDefined()

    if (queryWithUrlLoader) {
      const urlLoader = queryWithUrlLoader.use.find((u) =>
        u.loader.includes('url-loader'),
      )
      expect(urlLoader?.options?.publicPath).toBe('/_next/static/images/')
      expect(urlLoader?.options?.name).toBe('[name]-[hash].[ext]')
    }
  })

  it('should use custom assetPrefix in url-loader options', () => {
    const nextConfig: NextConfig = {
      assetPrefix: 'https://cdn.example.com',
    }
    const queries = getResourceQueries(
      defaultOptimized,
      nextConfig,
      false,
      null,
      {},
      defaultDetectedLoaders,
    )

    const queryWithUrlLoader = queries.find((q) =>
      q.use.some((u) => u.loader.includes('url-loader')),
    )

    if (queryWithUrlLoader) {
      const urlLoader = queryWithUrlLoader.use.find((u) =>
        u.loader.includes('url-loader'),
      )
      expect(urlLoader?.options?.publicPath).toBe(
        'https://cdn.example.com/_next/static/images/',
      )
    }
  })
})

describe('resource query anchoring', () => {
  const queries = getResourceQueries(
    defaultOptimized,
    {},
    false,
    'img-loader',
    {},
    defaultDetectedLoaders,
  )
  const matching = (query: string) =>
    queries.filter((q) => q.resourceQuery.test(query))

  it('should not match substrings of unrelated parameters', () => {
    for (const query of [
      '?curl',
      '?url_x',
      '?hash=inline-ish',
      '?v=include',
      '?resized',
      '?sizeless',
      '?lqips',
      '?foo=url',
      '?dontrace',
    ]) {
      expect(matching(query)).toHaveLength(0)
    }
  })

  it('should keep matching documented queries', () => {
    for (const query of [
      '?url',
      '?inline',
      '?include',
      '?original',
      '?lqip',
      '?lqip&x=1',
      '?lqip-colors',
      '?resize&sizes[]=300&sizes[]=600',
      '?size=300',
      '?trace',
      '?x=1&url',
    ]) {
      expect(matching(query).length).toBeGreaterThan(0)
    }
  })

  it('should not treat ?lqip-colors as ?lqip', () => {
    const lqip = queries.find((q) => q.resourceQuery.test('?lqip'))
    expect(lqip?.resourceQuery.test('?lqip-colors')).toBe(false)
  })

  it('should match combinations in either order only with both params', () => {
    expect(
      matching('?url&original')[0].use.some((u) =>
        u.loader.includes('file-loader'),
      ),
    ).toBe(true)
    expect(matching('?original&url')[0]).toBe(matching('?url&original')[0])
    expect(matching('?url')[0]).not.toBe(matching('?url&original')[0])
  })
})
