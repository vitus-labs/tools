import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockNodeResolve,
  mockReplace,
  mockTerser,
  mockTypescript,
  mockApiExtractor,
  mockFilesize,
  mockVisualizer,
  mockConfig,
  mockPKG,
} = vi.hoisted(() => ({
  mockNodeResolve: vi.fn(() => ({ name: 'mock-resolve' })),
  mockReplace: vi.fn(() => ({ name: 'mock-replace' })),
  mockTerser: vi.fn(() => ({ name: 'mock-terser' })),
  mockTypescript: vi.fn(() => ({ name: 'mock-typescript' })),
  mockApiExtractor: vi.fn(() => ({ name: 'mock-api-extractor' })),
  mockFilesize: vi.fn(() => ({ name: 'mock-filesize' })),
  mockVisualizer: vi.fn(() => ({ name: 'mock-visualizer' })),
  mockConfig: {
    sourceDir: 'src',
    outputDir: 'lib',
    typesDir: 'lib/types',
    extensions: ['.ts', '.tsx', '.js'],
    typescript: true,
    replaceGlobals: true,
    visualise: { template: 'network', gzipSize: true, outputDir: 'analysis' },
    filesize: true,
    include: ['src'],
    exclude: ['node_modules/**'],
    external: ['react/jsx-runtime'],
    globals: { react: 'React' },
  } as Record<string, any>,
  mockPKG: {
    name: '@test/pkg',
    version: '1.0.0',
    bundleName: 'testPkg',
    externalDependencies: ['react'],
  } as Record<string, any>,
}))

vi.mock('@rollup/plugin-node-resolve', () => ({
  nodeResolve: mockNodeResolve,
}))
vi.mock('@rollup/plugin-replace', () => ({ default: mockReplace }))
vi.mock('@rollup/plugin-terser', () => ({ default: mockTerser }))
vi.mock('rollup-plugin-typescript2', () => ({ default: mockTypescript }))
vi.mock('rollup-plugin-api-extractor', () => ({
  apiExtractor: mockApiExtractor,
}))
vi.mock('rollup-plugin-filesize', () => ({ default: mockFilesize }))
vi.mock('rollup-plugin-visualizer', () => ({ visualizer: mockVisualizer }))

vi.mock('node:module', () => ({
  createRequire: vi.fn(() => vi.fn(() => ({}))),
}))

vi.mock('@vitus-labs/tools-core', () => ({
  swapGlobals: (globals: Record<string, string>) =>
    Object.fromEntries(Object.entries(globals).map(([k, v]) => [v, k])),
}))

vi.mock('../config/index.js', () => ({
  CONFIG: mockConfig,
  PKG: mockPKG,
  PLATFORMS: ['browser', 'node', 'web', 'native'],
}))

import rollupConfig from './config.js'

const defaultConfig = { ...mockConfig }
const defaultPKG = { ...mockPKG }

describe('rollupConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockConfig, defaultConfig)
    Object.assign(mockPKG, defaultPKG)
  })

  it('should create a valid ES module build config', () => {
    const config = rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.input).toBe('src')
    expect(config.output.file).toBe('lib/index.js')
    expect(config.output.format).toBe('es')
    expect(config.output.sourcemap).toBe(true)
    expect(config.external).toContain('react')
    expect(config.external).toContain('react/jsx-runtime')
  })

  it('should set named exports for CJS format', () => {
    const config = rollupConfig({
      file: 'lib/index.cjs',
      format: 'cjs',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.exports).toBe('named')
  })

  it('should set name for UMD format', () => {
    const config = rollupConfig({
      file: 'lib/index.umd.js',
      format: 'umd',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.name).toBe('testPkg')
    expect(config.output.exports).toBe('named')
  })

  it('should not set name for ES format', () => {
    const config = rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.name).toBeUndefined()
    expect(config.output.exports).toBeUndefined()
  })

  it('should add platform-specific extensions for known platforms', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'browser',
    })

    expect(mockNodeResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: true,
        extensions: expect.arrayContaining(['.browser.ts']),
      }),
    )
  })

  it('should not add platform extensions for unknown platforms', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockNodeResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: false,
        extensions: expect.not.arrayContaining(['.universal.ts']),
      }),
    )
  })

  it('should add typescript plugin when enabled', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockTypescript).toHaveBeenCalled()
  })

  it('should add apiExtractor when typesFilePath is provided', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
      typesFilePath: './lib/index.d.ts',
    })

    expect(mockApiExtractor).toHaveBeenCalled()
  })

  it('should add replace plugin when replaceGlobals is true', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'node',
    })

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        preventAssignment: true,
        values: expect.objectContaining({
          __VERSION__: '"1.0.0"',
          __NODE__: 'true',
        }),
      }),
    )
  })

  it('should add process.env.NODE_ENV for production', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'production',
      platform: 'universal',
    })

    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          'process.env.NODE_ENV': '"production"',
        }),
      }),
    )
  })

  it('should add terser for production builds', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'production',
      platform: 'universal',
    })

    expect(mockTerser).toHaveBeenCalled()
  })

  it('should not add terser for development builds', () => {
    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockTerser).not.toHaveBeenCalled()
  })

  it('should skip replace plugin when replaceGlobals is false', () => {
    mockConfig.replaceGlobals = false

    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('should skip typescript plugin when disabled', () => {
    mockConfig.typescript = false

    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockTypescript).not.toHaveBeenCalled()
  })

  it('should skip visualizer when visualise is false', () => {
    mockConfig.visualise = false

    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockVisualizer).not.toHaveBeenCalled()
  })

  it('should skip filesize when disabled', () => {
    mockConfig.filesize = false

    rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(mockFilesize).not.toHaveBeenCalled()
  })

  it('should swap globals in output', () => {
    const config = rollupConfig({
      file: 'lib/index.js',
      format: 'es',
      env: 'development',
      platform: 'universal',
    })

    expect(config.output.globals).toEqual({ React: 'react' })
  })
})
