import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Configuration } from 'webpack'
import withOptimizedImages from './index.ts'

const createWebpackOptions = (overrides?: Record<string, unknown>) =>
  ({
    defaultLoaders: { babel: {} },
    dev: false,
    isServer: false,
    ...overrides,
  }) as any

const createWebpackConfig = (): Configuration => ({ module: { rules: [] } })

describe('image optimization wiring', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'optimized-images-'))
    // Static fixture sources: each fake plugin echoes its name and options.
    const fixtures: Record<string, string> = {
      'imagemin-mozjpeg':
        "module.exports = (opts) => ({ plugin: 'imagemin-mozjpeg', opts })",
      'imagemin-gifsicle':
        "module.exports = (opts) => ({ plugin: 'imagemin-gifsicle', opts })",
    }
    for (const [name, source] of Object.entries(fixtures)) {
      const pkg = path.join(dir, 'node_modules', name)
      mkdirSync(pkg, { recursive: true })
      writeFileSync(
        path.join(pkg, 'package.json'),
        JSON.stringify({ name, main: 'index.js' }),
      )
      writeFileSync(path.join(pkg, 'index.js'), source)
    }
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const findImgLoaderOptions = (config: Configuration) => {
    const rule = ((config.module?.rules ?? []) as any[]).find(
      (r) => r.oneOf && String(r.test).includes('jpe?g'),
    )
    const defaultEntry = rule.oneOf[rule.oneOf.length - 1]

    return defaultEntry.use.find((u: any) => u.loader.includes('img-loader'))
      .options
  }

  it('should produce synchronously resolvable plugins using the withOptimizedImages options and defaults', () => {
    const config = withOptimizedImages({ mozjpeg: { quality: 42 } })({
      overwriteImageLoaderPaths: dir,
    })
    const webpackConfig = config.webpack(
      createWebpackConfig(),
      createWebpackOptions(),
    )

    const options = findImgLoaderOptions(webpackConfig)

    // webpack does not await options; img-loader calls a plugins function
    expect(typeof options.then).toBe('undefined')
    expect(options.plugins()).toEqual([
      { plugin: 'imagemin-mozjpeg', opts: { quality: 42 } },
      {
        plugin: 'imagemin-gifsicle',
        opts: { interlaced: true, optimizationLevel: 3 },
      },
    ])
  })

  it('should not optimize (empty plugins) outside of optimized steps', () => {
    const config = withOptimizedImages()({ overwriteImageLoaderPaths: dir })
    const webpackConfig = config.webpack(
      createWebpackConfig(),
      createWebpackOptions({ dev: true }),
    )

    expect(findImgLoaderOptions(webpackConfig).plugins).toEqual([])
  })
})

describe('turbopack warning', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('should warn once when TURBOPACK is set', async () => {
    vi.resetModules()
    vi.stubEnv('TURBOPACK', 'auto')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { default: plugin } = await import('./index.ts')

    plugin()({})
    plugin()({})

    const warnings = log.mock.calls.filter((c) =>
      String(c[0]).includes('Turbopack'),
    )
    expect(warnings).toHaveLength(1)
    expect(String(warnings[0][0])).toContain('--webpack')
  })

  it('should not warn when TURBOPACK is not set', () => {
    vi.stubEnv('TURBOPACK', '')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    withOptimizedImages()({})

    expect(log).not.toHaveBeenCalled()
  })
})
