import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * End-to-end regression lock for the build-correctness fixes. The fixture
 * combines every shape that used to break:
 *
 *   - root entry is `src/index.tsx` (was hardcoded to index.ts)
 *   - `./devtools` is a directory entry `src/devtools/index.ts` (DTS failed
 *     with UNRESOLVED_ENTRY)
 *   - `import` / `require` map to `.mjs` / `.cjs` (shared-chunk build always
 *     wrote `.js`)
 *   - `module` equals `exports.import` (file was built twice)
 *   - `"browser": { "fs": false }` (crashed with `value.substring`)
 *   - `./features/*` wildcard export (produced a literal `*` input)
 *   - types dir == JS dir, so JS `_chunks/` must survive the DTS step
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = resolve(
  __dirname,
  '..',
  '..',
  'test-fixtures',
  'build-correctness',
)
const BIN = resolve(__dirname, '..', 'bin', 'run-build.ts')
const LIB = join(FIXTURE, 'lib')

const cleanup = () => rmSync(LIB, { recursive: true, force: true })

describe('rolldown build correctness', () => {
  let output = ''

  beforeAll(() => {
    cleanup()
    const res = spawnSync('bun', ['run', BIN], {
      cwd: FIXTURE,
      encoding: 'utf-8',
    })
    // the wildcard warning goes to stderr
    output = `${res.stdout}${res.stderr}`
    if (res.status !== 0) throw new Error(output)
  }, 90_000)

  afterAll(cleanup)

  it('emits files with the extensions declared in package.json', () => {
    for (const f of [
      'index.mjs',
      'index.cjs',
      'devtools.mjs',
      'devtools.cjs',
    ]) {
      expect(existsSync(join(LIB, f))).toBe(true)
    }
    expect(existsSync(join(LIB, 'index.js'))).toBe(false)
    expect(existsSync(join(LIB, 'devtools.js'))).toBe(false)
  })

  it('generates declarations for directory subpath exports and index.tsx', () => {
    expect(existsSync(join(LIB, 'index.d.ts'))).toBe(true)
    expect(existsSync(join(LIB, 'devtools.d.ts'))).toBe(true)
  })

  it('keeps JS shared chunks when the types dir equals the JS dir', () => {
    const chunks = readdirSync(join(LIB, '_chunks'))
    expect(chunks.some((f) => f.endsWith('.mjs'))).toBe(true)
    expect(chunks.some((f) => f.endsWith('.cjs'))).toBe(true)
  })

  it('builds each file once and skips the wildcard export with a warning', () => {
    expect(output).toMatch(/Building 4 bundles/)
    expect(output).toMatch(/Skipping wildcard export "\.\/features\/\*"/)
    expect(existsSync(join(LIB, 'features'))).toBe(false)
  })
})
