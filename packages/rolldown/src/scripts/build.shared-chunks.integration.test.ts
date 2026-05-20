import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = resolve(
  __dirname,
  '..',
  '..',
  'test-fixtures',
  'multi-entry-sharing',
)
const BIN = resolve(__dirname, '..', 'bin', 'run-build.ts')
const LIB = join(FIXTURE, 'lib')

const cleanup = () => rmSync(LIB, { recursive: true, force: true })

const countSubstring = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1

describe('rolldown multi-entry shared-chunk dedup', () => {
  beforeAll(() => {
    cleanup()
    execFileSync('bun', ['run', BIN], { cwd: FIXTURE, stdio: 'pipe' })
  }, 60_000)

  afterAll(cleanup)

  it('emits a shared chunk for the module imported by 2+ entries', () => {
    expect(existsSync(join(LIB, '_chunks'))).toBe(true)
    const chunks = readdirSync(join(LIB, '_chunks')).filter((f) =>
      f.endsWith('.js'),
    )
    expect(chunks.length).toBeGreaterThanOrEqual(1)

    // Sum every Symbol("shared-sentinel") literal across all .js outputs.
    // Bug shape: 3 (inlined into each entry). Fix shape: 1 (in shared chunk).
    const allJs = [
      ...readdirSync(LIB)
        .filter((f) => f.endsWith('.js'))
        .map((f) => join(LIB, f)),
      ...chunks.map((f) => join(LIB, '_chunks', f)),
    ]
    const total = allJs.reduce(
      (n, f) =>
        n +
        countSubstring(readFileSync(f, 'utf8'), 'Symbol("shared-sentinel")'),
      0,
    )
    expect(total).toBe(1)
  })

  it('preserves shared module identity across sub-entries (regression for @pyreon/head)', async () => {
    const idx = await import(`${LIB}/index.js`)
    const use = await import(`${LIB}/use.js`)
    const peek = await import(`${LIB}/peek.js`)

    // Identity: the Symbol exported from each entry must be the same value.
    expect(idx.SENTINEL).toBe(use.sentinelFromUse())
    expect(idx.SENTINEL).toBe(peek.sentinelFromPeek())
    expect(use.sentinelFromUse()).toBe(peek.sentinelFromPeek())

    // Cross-entry state: write via one entry, read via another. Was the
    // failure mode that dropped @pyreon/head's SEO meta tags silently.
    use.writeFromUse('hello from use')
    expect(idx.REGISTRY.size).toBe(1)
    expect(peek.peekFromPeek()).toBe('hello from use')
  })

  it('still emits one .js file per declared sub-entry', () => {
    expect(existsSync(join(LIB, 'index.js'))).toBe(true)
    expect(existsSync(join(LIB, 'use.js'))).toBe(true)
    expect(existsSync(join(LIB, 'peek.js'))).toBe(true)
  })
})
