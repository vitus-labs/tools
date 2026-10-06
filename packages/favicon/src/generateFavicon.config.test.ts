import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Real baseConfig and real @vitus-labs/tools-core (no config file => defaults
// only). Only the `favicons` library and the filesystem writes are mocked.
const mockFavicons = vi.fn()
vi.mock('favicons', () => ({ default: mockFavicons }))

const mockWriteFileSync = vi.fn()
const mockMkdirSync = vi.fn()
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  const patched = {
    ...actual,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  }
  return { ...patched, default: patched }
})

const response = {
  images: [{ name: 'icon.png', contents: Buffer.from('x') }],
  files: [{ name: 'manifest.webmanifest', contents: Buffer.from('{}') }],
}

// Real core, but the user-config layer is replaced with `userConfig`.
const withUserConfig = (userConfig: Record<string, any>) =>
  vi.doMock('@vitus-labs/tools-core', async (importOriginal) => {
    const actual = await importOriginal<any>()
    return {
      ...actual,
      VL_CONFIG: () => ({
        merge: (defaults: any) => ({ config: { ...defaults, ...userConfig } }),
      }),
    }
  })

describe('generateFavicons with the real default config', () => {
  beforeEach(() => {
    mockFavicons.mockReset()
    mockWriteFileSync.mockClear()
    mockMkdirSync.mockClear()
    vi.resetModules()
    vi.doUnmock('@vitus-labs/tools-core')
  })

  it('does not throw and generates nothing when no sources are configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { generateFavicons } = await import('./generateFavicon.ts')

    await expect(generateFavicons()).resolves.toBeUndefined()
    expect(mockFavicons).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('No icon sources configured'),
    )
    warn.mockRestore()
  })

  it('passes platform toggles to favicons as `icons`, with a defined path', async () => {
    mockFavicons.mockResolvedValue(response)
    withUserConfig({ icons: [{ input: 'logo.png', output: '/abs/out' }] })
    const { generateFavicons } = await import('./generateFavicon.ts')

    await generateFavicons()

    const [input, options] = mockFavicons.mock.calls[0]
    expect(input).toBe(path.resolve(process.cwd(), 'logo.png'))
    expect(options.path).toBe('/')
    expect(options.icons).toMatchObject({ android: true, appleIcon: true })
    expect(Array.isArray(options.icons)).toBe(false)
    // absolute output is honoured, not prefixed with cwd
    expect(mockMkdirSync).toHaveBeenCalledWith(path.resolve('/abs/out'), {
      recursive: true,
    })
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      path.join(path.resolve('/abs/out'), 'icon.png'),
      expect.anything(),
    )
  })

  it('rejects `icons` that is neither an array nor a platform object', async () => {
    withUserConfig({ icons: 'x' })
    const { generateFavicons } = await import('./generateFavicon.ts')

    await expect(generateFavicons()).rejects.toThrow('`icons` must be an array')
  })

  it('treats a legacy platform-toggle `icons` object as platforms', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    withUserConfig({ icons: { android: false } })
    const { generateFavicons } = await import('./generateFavicon.ts')

    await expect(generateFavicons()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'))
    warn.mockRestore()
  })
})
