import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Regression for the 2.6.1 ENOENT crash on duplicate entry stems.
 *
 * Shape: two subpath exports map to the same `types` path — common when
 * two runtimes share one implementation (e.g. JSX runtime + dev-runtime,
 * or any compat-layer pattern). The fixture mirrors @pyreon/preact-compat:
 *
 *   "./jsx-runtime":     { types: "./lib/types/jsx-runtime.d.ts", ... }
 *   "./jsx-dev-runtime": { types: "./lib/types/jsx-runtime.d.ts", ... }
 *
 * Both DTS configs land in the same grouped bucket with the same
 * `output.entryFileNames` -> stem `jsx-runtime` appears twice in
 * `entryStems`. Pre-fix, promoteEntries iterated the dup stem twice;
 * iteration 1 renamed `jsx-runtime2.d.ts` out of the temp dir, iteration 2
 * `statSync`ed it (via a stale `readdirSync` snapshot) → ENOENT.
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = resolve(__dirname, '..', '..', 'test-fixtures', 'dup-stem')
const BIN = resolve(__dirname, '..', 'bin', 'run-build.ts')
const LIB = join(FIXTURE, 'lib')

const cleanup = () => rmSync(LIB, { recursive: true, force: true })

describe('rolldown DTS: duplicate entry stems (two subpaths → one types path)', () => {
  beforeAll(() => {
    cleanup()
    execFileSync('bun', ['run', BIN], { cwd: FIXTURE, stdio: 'pipe' })
  }, 60_000)

  afterAll(cleanup)

  it('completes the build without ENOENT on the dup stem', () => {
    // beforeAll would have thrown if the build failed.
    expect(existsSync(join(LIB, 'types'))).toBe(true)
  })

  it('produces exactly one .d.ts at the dup stem (the second subpath shares it)', () => {
    const types = readdirSync(join(LIB, 'types')).filter((f) =>
      f.endsWith('.d.ts'),
    )
    expect(types).toContain('jsx-runtime.d.ts')
    // No leftover stubs / numbered artifacts from the plugin.
    expect(types).not.toContain('jsx-runtime2.d.ts')
    expect(types).not.toContain('jsx-runtime3.d.ts')
  })

  it('jsx-runtime.d.ts has real declarations (not the empty stub)', () => {
    const content = readFileSync(
      join(LIB, 'types', 'jsx-runtime.d.ts'),
      'utf-8',
    )
    expect(content).toMatch(/jsx|Fragment/)
    // The plugin's stub is literally `export { };` — fail if we shipped that.
    expect(content.trim()).not.toBe('export { };')
  })

  it('produced .d.ts files typecheck strictly (skipLibCheck: false)', () => {
    const probeDir = join(LIB, '__typecheck_probe')
    rmSync(probeDir, { recursive: true, force: true })
    const fs = require('node:fs') as typeof import('node:fs')
    fs.mkdirSync(probeDir, { recursive: true })
    fs.writeFileSync(
      join(probeDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2024',
          module: 'Preserve',
          moduleResolution: 'Bundler',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ['../types/*.d.ts'],
      }),
    )
    expect(() =>
      execFileSync('bunx', ['tsc', '-p', join(probeDir, 'tsconfig.json')], {
        stdio: 'pipe',
      }),
    ).not.toThrow()
    rmSync(probeDir, { recursive: true, force: true })
  }, 30_000)
})
