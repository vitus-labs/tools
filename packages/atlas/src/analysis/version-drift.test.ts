import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DepGraph } from '../types'
import { detectVersionDrift } from './version-drift'

let tmpDir: string

const writePkg = (dir: string, pkg: Record<string, unknown>) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
}

beforeEach(() => {
  tmpDir = join(tmpdir(), `atlas-drift-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('detectVersionDrift', () => {
  it('should detect version drift for external deps', () => {
    const dirA = join(tmpDir, 'a')
    const dirB = join(tmpDir, 'b')
    writePkg(dirA, {
      name: '@s/a',
      dependencies: { typescript: '^5.8.0' },
    })
    writePkg(dirB, {
      name: '@s/b',
      dependencies: { typescript: '^5.9.3' },
    })

    const graph: DepGraph = {
      nodes: [
        { name: '@s/a', version: '1.0.0', path: dirA, private: false },
        { name: '@s/b', version: '1.0.0', path: dirB, private: false },
      ],
      edges: [],
    }

    const result = detectVersionDrift(graph)
    expect(result.hasDrifts).toBe(true)
    expect(result.drifts).toHaveLength(1)
    expect(result.drifts[0]?.dependency).toBe('typescript')
  })

  it('should not flag aligned versions', () => {
    const dirA = join(tmpDir, 'a')
    const dirB = join(tmpDir, 'b')
    writePkg(dirA, {
      name: '@s/a',
      dependencies: { typescript: '^5.9.3' },
    })
    writePkg(dirB, {
      name: '@s/b',
      dependencies: { typescript: '^5.9.3' },
    })

    const graph: DepGraph = {
      nodes: [
        { name: '@s/a', version: '1.0.0', path: dirA, private: false },
        { name: '@s/b', version: '1.0.0', path: dirB, private: false },
      ],
      edges: [],
    }

    const result = detectVersionDrift(graph)
    expect(result.hasDrifts).toBe(false)
  })

  it('should skip internal workspace deps', () => {
    const dirA = join(tmpDir, 'a')
    const dirB = join(tmpDir, 'b')
    writePkg(dirA, {
      name: '@s/a',
      dependencies: { '@s/b': '1.0.0' },
    })
    writePkg(dirB, {
      name: '@s/b',
      dependencies: { '@s/a': '2.0.0' },
    })

    const graph: DepGraph = {
      nodes: [
        { name: '@s/a', version: '1.0.0', path: dirA, private: false },
        { name: '@s/b', version: '1.0.0', path: dirB, private: false },
      ],
      edges: [],
    }

    const result = detectVersionDrift(graph)
    expect(result.hasDrifts).toBe(false)
  })

  it('should check across dep types', () => {
    const dirA = join(tmpDir, 'a')
    const dirB = join(tmpDir, 'b')
    writePkg(dirA, {
      name: '@s/a',
      dependencies: { react: '^18.0.0' },
    })
    writePkg(dirB, {
      name: '@s/b',
      peerDependencies: { react: '^19.0.0' },
    })

    const graph: DepGraph = {
      nodes: [
        { name: '@s/a', version: '1.0.0', path: dirA, private: false },
        { name: '@s/b', version: '1.0.0', path: dirB, private: false },
      ],
      edges: [],
    }

    const result = detectVersionDrift(graph)
    expect(result.hasDrifts).toBe(true)
    expect(result.drifts[0]?.dependency).toBe('react')
  })
})
