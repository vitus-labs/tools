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

  // Perf regression lock: with 3 DTS entries sharing an output dir, the
  // build must take the single-pass path (one rolldown call + one
  // plugin instantiation) instead of the per-entry loop. The single-pass
  // log line includes the "single-pass" marker; the legacy path does not.
  // Falling back to the legacy path would re-introduce N plugin
  // instantiations and the `[PLUGIN_TIMINGS] rolldown-plugin-dts:generate`
  // warning per entry.
  it('uses the single-pass DTS path for multi-entry groups', () => {
    cleanup()
    const out = execFileSync('bun', ['run', BIN], {
      cwd: FIXTURE,
      stdio: 'pipe',
      encoding: 'utf-8',
    })
    expect(out).toMatch(/DTS .* single-pass/)
    // And it must NOT log any per-entry DTS lines for entries we expect
    // to be grouped (those would indicate fallback to the per-entry loop).
    expect(out).not.toMatch(/DTS -> [^{]*use\.d\.ts \(\d+ms\)$/m)
    expect(out).not.toMatch(/DTS -> [^{]*peek\.d\.ts \(\d+ms\)$/m)
  })

  it('produces correct per-entry .d.ts files', () => {
    expect(existsSync(join(LIB, 'types', 'index.d.ts'))).toBe(true)
    expect(existsSync(join(LIB, 'types', 'use.d.ts'))).toBe(true)
    expect(existsSync(join(LIB, 'types', 'peek.d.ts'))).toBe(true)

    // The plugin's `<name>2.d.ts` stubs must be cleaned up after the
    // post-process step — anything else means we shipped raw plugin
    // artifacts to consumers.
    const types = readdirSync(join(LIB, 'types'))
    expect(types).not.toContain('index2.d.ts')
    expect(types).not.toContain('use2.d.ts')
    expect(types).not.toContain('peek2.d.ts')
  })
})
