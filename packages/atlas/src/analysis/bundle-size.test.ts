import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DepGraph } from '../types'
import { analyzeBundleSize } from './bundle-size'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `atlas-size-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })
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
