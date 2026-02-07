import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockRollup,
  mockBundleWrite,
  mockCreateBuildPipeline,
  mockRollupConfig,
} = vi.hoisted(() => ({
  mockRollup: vi.fn(),
  mockBundleWrite: vi.fn(),
  mockCreateBuildPipeline: vi.fn(),
  mockRollupConfig: vi.fn(),
}))

vi.mock('rollup', () => ({ rollup: mockRollup }))
vi.mock('rimraf', () => ({ rimraf: { sync: vi.fn() } }))

vi.mock('../config/index.js', () => ({
  CONFIG: { outputDir: 'lib' },
}))

vi.mock('../rollup/index.js', () => ({
  createBuildPipeline: mockCreateBuildPipeline,
  config: mockRollupConfig,
}))

describe('build', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockBundleWrite.mockResolvedValue(undefined)
    mockRollup.mockResolvedValue({ write: mockBundleWrite })

    mockCreateBuildPipeline.mockReturnValue([
      {
        file: 'lib/index.js',
        format: 'es',
        env: 'development',
        platform: 'universal',
      },
    ])
    mockRollupConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: { file: item.file, format: item.format },
    }))
  })

  it('should execute build pipeline successfully', async () => {
    vi.resetModules()
    const { runBuild } = await import('./build.js')

    await runBuild()

    expect(mockRollup).toHaveBeenCalled()
    expect(mockBundleWrite).toHaveBeenCalled()
  })

  it('should handle build failure gracefully', async () => {
    const buildError = new Error('rollup failed')
    mockRollup.mockRejectedValue(buildError)

    vi.resetModules()
    const { runBuild } = await import('./build.js')
    vi.clearAllMocks()

    mockRollup.mockRejectedValue(buildError)
    mockRollupConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: { file: item.file, format: item.format },
    }))

    await expect(runBuild()).rejects.toThrow('rollup failed')
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

    // Re-setup after clear
    mockRollup.mockResolvedValue({ write: mockBundleWrite })
    mockBundleWrite.mockResolvedValue(undefined)
    mockRollupConfig.mockImplementation((item: any) => ({
      input: 'src',
      output: { file: item.file, format: item.format },
    }))

    await runBuild()

    expect(mockRollupConfig).toHaveBeenCalledTimes(2)
  })
})
