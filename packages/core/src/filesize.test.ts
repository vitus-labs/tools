import { gzipSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import { filesize, formatBytes } from './filesize.ts'

const chunk = (fileName: string, code: string) => ({
  type: 'chunk',
  fileName,
  code,
})

const run = (
  bundle: Record<string, any>,
  options: Parameters<typeof filesize>[0] = {},
) => {
  const log = vi.fn()
  const plugin = filesize({ ...options, log })
  plugin.generateBundle({}, bundle)

  return log.mock.calls.map(([line]) => line as string)
}

describe('formatBytes', () => {
  it('reports raw bytes below 1 kB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
  })

  it('switches unit at each factor of 1000', () => {
    expect(formatBytes(1000)).toBe('1.00 kB')
    expect(formatBytes(1_500_000)).toBe('1.50 MB')
    expect(formatBytes(2_000_000_000)).toBe('2.00 GB')
  })

  it('stays in GB rather than inventing a larger unit', () => {
    expect(formatBytes(5_000_000_000_000)).toBe('5000.00 GB')
  })
})

describe('filesize', () => {
  it('is a named plugin exposing generateBundle', () => {
    const plugin = filesize()

    expect(plugin.name).toBe('vl-filesize')
    expect(typeof plugin.generateBundle).toBe('function')
  })

  it('reports raw and gzip size for each chunk', () => {
    const code = 'export const a = 1\n'.repeat(20)
    const lines = run({ 'index.js': chunk('index.js', code) })

    const raw = Buffer.from(code, 'utf8')
    expect(lines).toEqual([
      `  index.js ${formatBytes(raw.byteLength)} · ${formatBytes(
        gzipSync(raw).byteLength,
      )} gzip`,
    ])
  })

  it('reports every chunk in the bundle', () => {
    const lines = run({
      'index.js': chunk('index.js', 'const a = 1'),
      'vendor.js': chunk('vendor.js', 'const b = 2'),
    })

    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('index.js')
    expect(lines[1]).toContain('vendor.js')
  })

  it('skips assets, which carry no code to measure', () => {
    const lines = run({
      'index.js': chunk('index.js', 'const a = 1'),
      'index.js.map': { type: 'asset', fileName: 'index.js.map', source: '{}' },
    })

    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('index.js ')
  })

  it('treats an isAsset entry as an asset when type is absent', () => {
    const lines = run({
      'logo.svg': { isAsset: true, fileName: 'logo.svg', code: '<svg/>' },
    })

    expect(lines).toEqual([])
  })

  it('skips chunk-shaped entries that have no code', () => {
    const lines = run({
      'empty.js': { type: 'chunk', fileName: 'empty.js' },
    })

    expect(lines).toEqual([])
  })

  it('applies the supplied formatters', () => {
    const lines = run(
      { 'index.js': chunk('index.js', 'const a = 1') },
      { name: (t) => `<${t}>`, value: (t) => `[${t}]` },
    )

    expect(lines[0]).toMatch(/^ {2}<index\.js> \[.+\]$/)
  })

  it('falls back to a placeholder when the file name is missing', () => {
    const lines = run({ anon: { type: 'chunk', code: 'const a = 1' } })

    expect(lines[0]).toContain('<unknown>')
  })

  it('defaults to console.log', () => {
    // Swallow the write so the report does not pollute test output.
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    filesize().generateBundle(
      {},
      { 'index.js': chunk('index.js', 'const a=1') },
    )

    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
