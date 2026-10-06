import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DepGraph } from '../types.ts'
import { analyzeBundleSize } from './bundle-size.ts'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'atlas-size-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

const makeNode = (name: string, dir: string) => ({
  name,
  version: '1.0.0',
  path: dir,
  private: false,
})

describe('analyzeBundleSize', () => {
  it('should compute lib directory size', () => {
    const pkgDir = join(tmpDir, 'pkg-a')
    const libDir = join(pkgDir, 'lib')
    mkdirSync(libDir, { recursive: true })
    writeFileSync(join(libDir, 'index.js'), 'x'.repeat(1000))

    const graph: DepGraph = {
      nodes: [makeNode('@scope/pkg-a', pkgDir)],
      edges: [],
    }
    const result = analyzeBundleSize(graph)
    expect(result.sizeMap['@scope/pkg-a']?.libSize).toBe(1000)
  })

  it('should return 0 for packages without lib/', () => {
    const pkgDir = join(tmpDir, 'pkg-a')
    mkdirSync(pkgDir, { recursive: true })

    const graph: DepGraph = {
      nodes: [makeNode('@scope/pkg-a', pkgDir)],
      edges: [],
    }
    const result = analyzeBundleSize(graph)
    expect(result.sizeMap['@scope/pkg-a']?.libSize).toBe(0)
  })

  it('should compute transitive size including dependencies', () => {
    const dirA = join(tmpDir, 'pkg-a')
    const dirB = join(tmpDir, 'pkg-b')
    mkdirSync(join(dirA, 'lib'), { recursive: true })
    mkdirSync(join(dirB, 'lib'), { recursive: true })
    writeFileSync(join(dirA, 'lib', 'index.js'), 'x'.repeat(500))
    writeFileSync(join(dirB, 'lib', 'index.js'), 'x'.repeat(300))

    const graph: DepGraph = {
      nodes: [makeNode('@scope/pkg-a', dirA), makeNode('@scope/pkg-b', dirB)],
      edges: [
        {
          source: '@scope/pkg-a',
          target: '@scope/pkg-b',
          depType: 'dependencies',
        },
      ],
    }
    const result = analyzeBundleSize(graph)
    expect(result.sizeMap['@scope/pkg-a']?.transitiveSize).toBe(800)
    expect(result.sizeMap['@scope/pkg-b']?.transitiveSize).toBe(300)
  })
})

describe('analyzeBundleSize — robustness', () => {
  it('keeps counting when one entry is a broken symlink', () => {
    const pkgDir = join(tmpDir, 'pkg-a')
    const libDir = join(pkgDir, 'lib')
    mkdirSync(libDir, { recursive: true })
    writeFileSync(join(libDir, 'index.js'), 'x'.repeat(500))
    symlinkSync(join(tmpDir, 'missing'), join(libDir, 'broken'))
    const graph: DepGraph = { nodes: [makeNode('a', pkgDir)], edges: [] }
    expect(analyzeBundleSize(graph).sizeMap.a?.libSize).toBe(500)
  })

  it('does not follow symlinked directories', () => {
    const pkgDir = join(tmpDir, 'pkg-a')
    const libDir = join(pkgDir, 'lib')
    const other = join(tmpDir, 'other')
    mkdirSync(libDir, { recursive: true })
    mkdirSync(other, { recursive: true })
    writeFileSync(join(libDir, 'index.js'), 'x'.repeat(100))
    writeFileSync(join(other, 'big.js'), 'x'.repeat(9000))
    symlinkSync(other, join(libDir, 'linked'))
    const graph: DepGraph = { nodes: [makeNode('a', pkgDir)], edges: [] }
    expect(analyzeBundleSize(graph).sizeMap.a?.libSize).toBe(100)
  })

  it('computes transitive size correctly with cycles', () => {
    const mk = (n: string, size: number) => {
      const d = join(tmpDir, n)
      mkdirSync(join(d, 'lib'), { recursive: true })
      writeFileSync(join(d, 'lib', 'i.js'), 'x'.repeat(size))
      return makeNode(n, d)
    }
    const edge = (source: string, target: string) => ({
      source,
      target,
      depType: 'dependencies' as const,
    })
    const graph: DepGraph = {
      nodes: [mk('a', 1), mk('b', 10), mk('c', 100)],
      edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'b')],
    }
    const { sizeMap } = analyzeBundleSize(graph)
    expect(sizeMap.a?.transitiveSize).toBe(111)
    expect(sizeMap.b?.transitiveSize).toBe(110)
    expect(sizeMap.c?.transitiveSize).toBe(110)
  })
})
