import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('rolldown-plugin-dts', () => ({
  dts: vi.fn(() => [{ name: 'mock-dts' }]),
}))
vi.mock('rollup-plugin-filesize', () => ({
  default: vi.fn(() => ({ name: 'mock-filesize' })),
}))
vi.mock('rollup-plugin-visualizer', () => ({
  visualizer: vi.fn(() => ({ name: 'mock-visualizer' })),
}))
vi.mock('@vitus-labs/tools-core', () => ({
  swapGlobals: (globals: Record<string, string>) =>
    Object.fromEntries(Object.entries(globals).map(([k, v]) => [v, k])),
}))

const { mockConfig, mockPKG } = vi.hoisted(() => ({
  mockConfig: {
    sourceDir: 'src',
    outputDir: 'lib',
    typesDir: 'lib/types',
    extensions: ['.ts', '.tsx', '.js'],
    typescript: true,
    replaceGlobals: true,
    visualise: { template: 'network', gzipSize: true, outputDir: 'analysis' },
    filesize: true,
    external: ['react/jsx-runtime'],
    globals: { react: 'React' },
  } as Record<string, any>,
  mockPKG: {
    name: '@test/pkg',
    version: '1.0.0',
    bundleName: 'testPkg',
    externalDependencies: ['react'],
    exports: { types: './lib/index.d.ts', import: './lib/index.js' },
  } as Record<string, any>,
}))

vi.mock('../config/index.js', () => ({
  CONFIG: mockConfig,
  PKG: mockPKG,
  PLATFORMS: ['browser', 'node', 'web', 'native'],
}))

import rolldownConfig, { buildDts } from './config.js'

const defaultConfig = { ...mockConfig }
const defaultPKG = { ...mockPKG }

describe('rolldownConfig', () => {
  beforeEach(() => {
    Object.assign(mockConfig, defaultConfig)
    Object.assign(mockPKG, defaultPKG)
  })

  it('should create a valid ES module build config', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.input).toBe('src')
    expect(config.output.format).toBe('es')
    expect(config.output.sourcemap).toBe(true)
    expect(config.output.esModule).toBe(true)
    expect(config.external).toContain('react')
    expect(config.external).toContain('react/jsx-runtime')
  })

  it('should set platform to node for node builds', () => {
    const config = rolldownConfig({
      file: 'lib/index.cjs',
      format: 'cjs',
      env: 'development',
      platform: 'node',
    })

    expect(config.platform).toBe('node')
    expect(config.output.exports).toBe('named')
  })

  it('should set platform to browser for browser builds', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'browser',
    })

    expect(config.platform).toBe('browser')
  })

  it('should set platform to neutral for unknown platforms', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.platform).toBe('neutral')
  })

  it('should add platform-specific extensions for known platforms', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'browser',
    })

    expect(config.resolve.extensions).toContain('.browser.ts')
    expect(config.resolve.extensions).toContain('.ts')
  })

  it('should not add platform extensions for unknown platforms', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.resolve.extensions).not.toContain('.universal.ts')
    expect(config.resolve.extensions).toContain('.ts')
  })

  it('should set name for UMD format', () => {
    const config = rolldownConfig({
      file: 'lib/index.umd.js',
      format: 'umd',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.name).toBe('testPkg')
    expect(config.output.exports).toBe('named')
  })

  it('should add define options with replaceGlobals', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'node',
    })

    expect(config.transform?.define?.__VERSION__).toBe('"1.0.0"')
    expect(config.transform?.define?.__NODE__).toBe('true')
  })

  it('should add process.env.NODE_ENV for production builds', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'production',
      platform: 'universal',
    })

    expect(config.transform?.define?.['process.env.NODE_ENV']).toBe(
      '"production"',
    )
    expect(config.output.minify).toBe(true)
  })

  it('should not minify development builds', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.minify).toBe(false)
  })

  it('should skip define options when replaceGlobals is false', () => {
    mockConfig.replaceGlobals = false

    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.transform).toBeUndefined()
  })

  it('should skip visualizer when visualise is false', () => {
    mockConfig.visualise = false

    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    const hasVisualizer = config.plugins.some(
      (p: any) => p?.name === 'mock-visualizer',
    )
    expect(hasVisualizer).toBe(false)
  })

  it('should skip filesize when filesize is false', () => {
    mockConfig.filesize = false

    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    const hasFilesize = config.plugins.some(
      (p: any) => p?.name === 'mock-filesize',
    )
    expect(hasFilesize).toBe(false)
  })

  it('should set tsconfig when typescript is enabled', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.tsconfig).toBe('tsconfig.json')
  })

  it('should skip tsconfig when typescript is disabled', () => {
    mockConfig.typescript = false

    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.tsconfig).toBeUndefined()
  })

  it('should swap globals in output', () => {
    const config = rolldownConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.globals).toEqual({ React: 'react' })
  })

  it('should set correct dir and entryFileNames from file path', () => {
    const config = rolldownConfig({
      file: 'lib/esm/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.dir).toBe('lib/esm')
    expect(config.output.entryFileNames).toBe('index.js')
  })

  it('should handle file path without slash', () => {
    const config = rolldownConfig({
      file: 'bundle.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.dir).toBe('.')
    expect(config.output.entryFileNames).toBe('bundle.js')
  })
})

describe('buildDts', () => {
  beforeEach(() => {
    Object.assign(mockConfig, defaultConfig)
    Object.assign(mockPKG, defaultPKG)
  })

  it('should return DTS config when typescript and types are available', () => {
    const result = buildDts()

    expect(result).not.toBeNull()
    expect(result?.file).toBe('./lib/index.d.ts')
    expect(result?.input).toBe('src/index.ts')
    expect(result?.tsconfig).toBe('tsconfig.json')
    expect(result?.output.format).toBe('es')
  })

  it('should return null when typescript is disabled', () => {
    mockConfig.typescript = false

    expect(buildDts()).toBeNull()
  })

  it('should return null when no types path exists', () => {
    mockPKG.exports = { import: './lib/index.js' }
    delete mockPKG.types
    delete mockPKG.typings

    expect(buildDts()).toBeNull()
  })

  it('should use PKG.types as fallback', () => {
    mockPKG.exports = {}
    mockPKG.types = './lib/types.d.ts'

    const result = buildDts()

    expect(result?.file).toBe('./lib/types.d.ts')
  })

  it('should use PKG.typings as final fallback', () => {
    mockPKG.exports = {}
    delete mockPKG.types
    mockPKG.typings = './lib/typings.d.ts'

    const result = buildDts()

    expect(result?.file).toBe('./lib/typings.d.ts')
  })

  it('should include external dependencies', () => {
    const result = buildDts()

    expect(result?.external).toContain('react')
    expect(result?.external).toContain('react/jsx-runtime')
  })

  it('should handle types path without slash', () => {
    mockPKG.exports = { types: 'index.d.ts' }

    const result = buildDts()

    expect(result?.output.dir).toBe('.')
    expect(result?.output.entryFileNames).toBe('index.d.ts')
  })
})
