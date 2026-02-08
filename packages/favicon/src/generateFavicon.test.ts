import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWriteFileSync = vi.fn()
vi.mock('node:fs', () => ({
  default: { writeFileSync: mockWriteFileSync },
  writeFileSync: mockWriteFileSync,
}))

const mockFavicons = vi.fn()
vi.mock('favicons', () => ({ default: mockFavicons }))

vi.mock('@vitus-labs/tools-core', () => ({
  VL_CONFIG: (_key: string) => ({
    config: {},
    get: vi.fn(),
    merge: (config: any) => ({
      config: {
        ...config,
        icons: [
          { input: 'src/icon.png', output: 'public/icons', path: 'icons' },
        ],
        path: '/assets',
      },
    }),
  }),
}))

describe('generateFavicons', () => {
  beforeEach(() => {
    mockWriteFileSync.mockClear()
    mockFavicons.mockClear()
  })

  it('should generate favicons for each icon config', async () => {
    mockFavicons.mockResolvedValue({
      images: [{ name: 'favicon.ico', contents: Buffer.from('icon') }],
      files: [{ name: 'manifest.json', contents: Buffer.from('{}') }],
    })

    vi.resetModules()
    const { generateFavicons } = await import('./generateFavicon.js')

    await generateFavicons()

    expect(mockFavicons).toHaveBeenCalledTimes(1)
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
  })

  it('should handle favicon generation errors', async () => {
    const consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined)

    mockFavicons.mockRejectedValue(new Error('Generation failed'))

    vi.resetModules()
    const { generateFavicons } = await import('./generateFavicon.js')

    await generateFavicons()

    expect(consoleSpy).toHaveBeenCalledWith('Generation failed')
    consoleSpy.mockRestore()
  })

  it('should write images and manifests to output path', async () => {
    mockFavicons.mockResolvedValue({
      images: [
        { name: 'icon-192.png', contents: Buffer.from('192') },
        { name: 'icon-512.png', contents: Buffer.from('512') },
      ],
      files: [{ name: 'manifest.webmanifest', contents: Buffer.from('{}') }],
    })

    vi.resetModules()
    const { generateFavicons } = await import('./generateFavicon.js')

    await generateFavicons()

    // 2 images + 1 manifest
    expect(mockWriteFileSync).toHaveBeenCalledTimes(3)
  })
})
