import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  flattenCondition,
  isWildcardSubpath,
  resolveSourceFile,
} from './resolveEntry.ts'

const root = mkdtempSync(join(tmpdir(), 'resolve-entry-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const touch = (rel: string) => {
  const file = join(root, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, '')
}

describe('resolveSourceFile', () => {
  it('prefers <path>.<ext>', () => {
    touch('a.ts')
    expect(resolveSourceFile(join(root, 'a'))).toBe(join(root, 'a.ts'))
  })

  it('resolves directory entries via <path>/index.<ext>', () => {
    touch('devtools/index.ts')
    expect(resolveSourceFile(join(root, 'devtools'))).toBe(
      join(root, 'devtools/index.ts'),
    )
  })

  it('resolves a root index.tsx entry', () => {
    touch('src/index.tsx')
    expect(resolveSourceFile(join(root, 'src/index'))).toBe(
      join(root, 'src/index.tsx'),
    )
  })

  it('falls back to .ts when nothing exists', () => {
    expect(resolveSourceFile(join(root, 'missing'))).toBe(
      join(root, 'missing.ts'),
    )
  })
})

describe('flattenCondition', () => {
  it('returns strings as-is and flattens nested conditions', () => {
    expect(flattenCondition('./a.js')).toBe('./a.js')
    expect(flattenCondition({ types: './a.d.ts', default: './a.js' })).toBe(
      './a.js',
    )
    expect(flattenCondition({ import: { default: './a.mjs' } })).toBe('./a.mjs')
    expect(flattenCondition({ types: './a.d.ts' })).toBeUndefined()
    expect(flattenCondition(null)).toBeUndefined()
  })
})

describe('isWildcardSubpath', () => {
  it('detects wildcard patterns', () => {
    expect(isWildcardSubpath('./features/*')).toBe(true)
    expect(isWildcardSubpath('./features')).toBe(false)
  })
})
