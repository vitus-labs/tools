import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Run the COMPILED bin via Node — not the source via bun.
 *
 * Why this exists: 2.6.0 shipped a `require('node:fs')` call inside an
 * ESM module (`repairStaleImports`). Source-running via bun MASKED the
 * bug because bun's runtime accepts `require()` in ESM as a leniency.
 * Node enforces strict ESM and throws `ReferenceError: require is not
 * defined` at runtime — but only for consumers who hit the new grouped
 * DTS path with ≥1 renamed entry. The existing source/bun integration
 * tests passed; the published `lib/` was broken for multi-entry consumers.
 *
 * This test runs the compiled bin in the same way npm/Node consumers do.
 * It catches the entire class: `require` in ESM, top-level await issues,
 * any CJS↔ESM interop the bun harness silently accepts.
 *
 * Requires `lib/` to exist. CI builds before tests; locally, if `lib/`
 * is missing the test self-skips with a clear message.
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const COMPILED_BIN = resolve(
  __dirname,
  '..',
  '..',
  'lib',
  'bin',
  'run-build.js',
)
// Dedicated fixture (a copy of multi-entry-sharing) so this test can run
// concurrently with build.shared-chunks.integration.test.ts without their
// `lib/` writes colliding under vitest's default file-level parallelism.
const FIXTURE = resolve(
  __dirname,
  '..',
  '..',
  'test-fixtures',
  'multi-entry-compiled',
)
const LIB = join(FIXTURE, 'lib')

const cleanup = () => rmSync(LIB, { recursive: true, force: true })

describe('compiled lib/scripts/build.js under strict Node ESM', () => {
  beforeAll(cleanup)
  afterAll(cleanup)

  // Parameterized over both runtimes — Node enforces strict ESM and
  // catches `require()` in ESM modules; bun is lenient there but
  // catches other things (e.g. real syntax/runtime errors). A bug must
  // not regress under EITHER runtime.
  for (const runtime of ['node', 'bun'] as const) {
    it(`runs the published bin via ${runtime} against the multi-entry fixture (regression for 2.6.0 \`require is not defined\`)`, () => {
      if (!existsSync(COMPILED_BIN)) {
        console.warn(
          `SKIP: ${COMPILED_BIN} not built; run \`bun run build\` first.`,
        )
        return
      }
      cleanup()
      // The exact ways npm consumers invoke the package's bin.
      // bun: `bun run vl_rolldown_build` / via package bin under bun.
      // node: `node ./node_modules/.bin/vl_rolldown_build` / npm consumers.
      expect(() =>
        execFileSync(runtime, [COMPILED_BIN], {
          cwd: FIXTURE,
          stdio: 'pipe',
        }),
      ).not.toThrow()
    }, 60_000)
  }
})
