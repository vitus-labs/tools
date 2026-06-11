import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = resolve(__dirname, '..', '..', 'test-fixtures', 'dts-pipeline')
const BIN = resolve(__dirname, '..', 'bin', 'run-build.ts')
const LIB = join(FIXTURE, 'lib')
const TYPES = join(LIB, 'types')

const cleanup = () => rmSync(LIB, { recursive: true, force: true })

describe('rolldown DTS integration', () => {
  beforeAll(() => {
    cleanup()
    execFileSync('bun', ['run', BIN], {
      cwd: FIXTURE,
      stdio: 'pipe',
    })
  }, 60_000)

  afterAll(cleanup)

  it('emits a .d.ts file for each subpath export', () => {
    expect(existsSync(join(TYPES, 'index.d.ts'))).toBe(true)
    expect(existsSync(join(TYPES, 'component.d.ts'))).toBe(true)
    expect(existsSync(join(TYPES, 'utils.d.ts'))).toBe(true)
  })

  it('emits real declarations, not JS source (regression: emitDtsOnly)', () => {
    for (const file of ['index.d.ts', 'component.d.ts', 'utils.d.ts']) {
      const content = readFileSync(join(TYPES, file), 'utf8')

      // declarations contain `declare`, `export type`, or `export {`
      expect(content).toMatch(/\b(declare|export\s+(type|\{|declare))/)

      // JS-style runtime code should not appear in declarations
      expect(content).not.toMatch(/=>\s*\{/)
      expect(content).not.toMatch(/^const\s+\w+\s*=\s*\(/m)
      expect(content).not.toMatch(/^function\s+\w+\s*\(/m)
    }
  })

  it('resolves .tsx source for subpath exports (regression: extension resolution)', () => {
    const content = readFileSync(join(TYPES, 'component.d.ts'), 'utf8')
    expect(content).toMatch(/ComponentProps/)
    expect(content).toMatch(/Component/)
  })

  it('preserves correct types per entry (regression: largest-file heuristic)', () => {
    const utils = readFileSync(join(TYPES, 'utils.d.ts'), 'utf8')
    const component = readFileSync(join(TYPES, 'component.d.ts'), 'utf8')

    expect(utils).toMatch(/Operation/)
    expect(utils).toMatch(/add/)
    expect(component).not.toMatch(/Operation/)
  })

  it('cleans up isolated temp directories', () => {
    const entries = readdirSync(TYPES, { withFileTypes: true })
    const tmpDirs = entries
      .filter((e) => e.isDirectory())
      .filter((e) => e.name.startsWith('__dts_tmp'))
    expect(tmpDirs).toHaveLength(0)
  })

  // Strictest correctness check: typecheck the produced .d.ts files as a
  // real consumer would (skipLibCheck: false). If any internal import
  // references a non-existent path (e.g. `./component2.js` after the
  // post-process renamed `component2.d.ts -> component.d.ts`), tsc fails
  // with TS2307. Without this check, "file exists" and content-pattern
  // tests pass while we ship broken type declarations to npm.
  // This fixture exercises the case: index.ts re-exports from both
  // component.tsx and utils.ts, so the plugin code-splits and produces
  // stub + numbered-real pairs that the post-process must wire up
  // correctly.
  it('produced .d.ts files typecheck strictly as a consumer would (skipLibCheck: false)', () => {
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
