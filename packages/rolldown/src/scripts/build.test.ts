import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockRolldown,
  mockBundleWrite,
  mockBundleClose,
  mockReaddirSync,
  mockCreateBuildPipeline,
  mockRolldownConfig,
  mockBuildDts,
} = vi.hoisted(() => ({
  mockRolldown: vi.fn(),
  mockBundleWrite: vi.fn(),
  mockBundleClose: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockCreateBuildPipeline: vi.fn(),
  mockRolldownConfig: vi.fn(),
  mockBuildDts: vi.fn(),
}))

vi.mock('rolldown', () => ({ rolldown: mockRolldown }))
vi.mock('rimraf', () => ({ rimraf: { sync: vi.fn() } }))
vi.mock('node:fs', () => ({
  readdirSync: mockReaddirSync,
  renameSync: vi.fn(),
  statSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

vi.mock('../config/index.js', () => ({
  CONFIG: { outputDir: 'lib' },
  PKG: { name: '@test/pkg', version: '1.0.0' },
}))

vi.mock('../rolldown/index.js', () => ({
  createBuildPipeline: mockCreateBuildPipeline,
  config: mockRolldownConfig,
  buildDts: mockBuildDts,
}))

describe('build', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockBundleWrite.mockResolvedValue(undefined)
    mockBundleClose.mockResolvedValue(undefined)
    mockRolldown.mockResolvedValue({
      write: mockBundleWrite,
      close: mockBundleClose,
    })
    mockReaddirSync.mockReturnValue([])

    mockCreateBuildPipeline.mockReturnValue([
      {
        file: 'lib/index.js',
        format: 'es',
        env: 'development',
        platform: 'universal',
      },
    ])
    mockRolldownConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: {
        dir: 'lib',
        entryFileNames: 'index.js',
        format: item.format,
      },
    }))
    mockBuildDts.mockReturnValue(null)
  })

  it('should execute build pipeline successfully', async () => {
    vi.resetModules()
    const { runBuild } = await import('./build.js')

    await runBuild()

    expect(mockRolldown).toHaveBeenCalled()
    expect(mockBundleWrite).toHaveBeenCalled()
    expect(mockBundleClose).toHaveBeenCalled()
  })

  it('should generate DTS when buildDts returns config', async () => {
    mockBuildDts.mockReturnValue({
      file: './lib/index.d.ts',
      input: 'src/index.ts',
      output: {
        dir: 'lib',
        entryFileNames: 'index.d.ts',
        format: 'es',
      },
    })

    vi.resetModules()
    const { runBuild } = await import('./build.js')
    vi.clearAllMocks()

    // Re-setup after clear
    mockRolldown.mockResolvedValue({
      write: mockBundleWrite,
      close: mockBundleClose,
    })
    mockBundleWrite.mockResolvedValue(undefined)
    mockBundleClose.mockResolvedValue(undefined)
    mockReaddirSync.mockReturnValue([])
    mockRolldownConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: {
        dir: 'lib',
        entryFileNames: 'index.js',
        format: item.format,
      },
    }))
    mockBuildDts.mockReturnValue({
      file: './lib/index.d.ts',
      input: 'src/index.ts',
      output: {
        dir: 'lib',
        entryFileNames: 'index.d.ts',
        format: 'es',
      },
    })

    await runBuild()

    // main build + DTS build = 2 rolldown calls
    expect(mockRolldown).toHaveBeenCalledTimes(2)
  })

  it('should handle DTS chunk consolidation', async () => {
    mockBuildDts.mockReturnValue({
      file: './lib/index.d.ts',
      input: 'src/index.ts',
      output: {
        dir: 'lib',
        entryFileNames: 'index.d.ts',
        format: 'es',
      },
    })

    vi.resetModules()
    const { runBuild } = await import('./build.js')
    const { statSync, unlinkSync, renameSync } = await import('node:fs')
    vi.clearAllMocks()

    // Re-setup
    mockRolldown.mockResolvedValue({
      write: mockBundleWrite,
      close: mockBundleClose,
    })
    mockBundleWrite.mockResolvedValue(undefined)
    mockBundleClose.mockResolvedValue(undefined)
    mockRolldownConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: {
        dir: 'lib',
        entryFileNames: 'index.js',
        format: item.format,
      },
    }))
    mockBuildDts.mockReturnValue({
      file: './lib/index.d.ts',
      input: 'src/index.ts',
      output: {
        dir: 'lib',
        entryFileNames: 'index.d.ts',
        format: 'es',
      },
    })
    mockReaddirSync.mockReturnValue(['chunk-abc.d.ts'])
    vi.mocked(statSync).mockImplementation((p: any) => {
      if (String(p).includes('chunk'))
        return { size: 1000 } as ReturnType<typeof statSync>
      return { size: 10 } as ReturnType<typeof statSync>
    })

    await runBuild()

    expect(unlinkSync).toHaveBeenCalled()
    expect(renameSync).toHaveBeenCalled()
  })

  it('should handle build failure gracefully', async () => {
    vi.resetModules()
    const { runBuild } = await import('./build.js')
    vi.clearAllMocks()

    const buildError = new Error('rolldown failed')
    mockRolldown.mockRejectedValue(buildError)
    mockReaddirSync.mockReturnValue([])
    mockRolldownConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: {
        dir: 'lib',
        entryFileNames: 'index.js',
        format: item.format,
      },
    }))
    mockBuildDts.mockReturnValue(null)

    await expect(runBuild()).rejects.toThrow('rolldown failed')
  })

  it('should handle multiple builds in sequence', async () => {
    mockCreateBuildPipeline.mockReturnValue([
      {
        file: 'lib/index.js',
        format: 'es',
        env: 'development',
        platform: 'universal',
      },
      {
        file: 'lib/index.cjs',
        format: 'cjs',
        env: 'development',
        platform: 'universal',
      },
    ])

    vi.resetModules()
    const { runBuild } = await import('./build.js')
    vi.clearAllMocks()

    mockRolldown.mockResolvedValue({
      write: mockBundleWrite,
      close: mockBundleClose,
    })
    mockBundleWrite.mockResolvedValue(undefined)
    mockBundleClose.mockResolvedValue(undefined)
    mockReaddirSync.mockReturnValue([])
    mockRolldownConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: {
        dir: 'lib',
        entryFileNames: 'index.js',
        format: item.format,
      },
    }))
    mockBuildDts.mockReturnValue(null)

    await runBuild()

    expect(mockRolldownConfig).toHaveBeenCalledTimes(2)
    expect(mockRolldown).toHaveBeenCalledTimes(2)
  })
})
