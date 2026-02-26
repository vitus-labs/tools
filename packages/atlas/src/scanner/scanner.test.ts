import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AtlasConfig } from '../types'
import { scanWorkspace } from './scanner'

const baseConfig: AtlasConfig = {
  workspaces: ['packages/*'],
  depTypes: ['dependencies', 'peerDependencies', 'devDependencies'],
  include: [],
  exclude: [],
  outputPath: './atlas.html',
  echartsCdn: '',
  open: false,
  title: '',
  report: false,
}

let tmpDir: string

const writePkg = (name: string, pkg: Record<string, unknown>) => {
  const dir = join(tmpDir, 'packages', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
}

beforeEach(() => {
  tmpDir = join(tmpdir(), `atlas-test-${Date.now()}`)
  mkdirSync(join(tmpDir, 'packages'), { recursive: true })
  vi.spyOn(process, 'cwd').mockReturnValue(tmpDir)
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('scanWorkspace', () => {
  it('should discover packages in workspace', () => {
    writePkg('pkg-a', { name: '@scope/pkg-a', version: '1.0.0' })
    writePkg('pkg-b', { name: '@scope/pkg-b', version: '2.0.0' })

    const graph = scanWorkspace(baseConfig)

    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.map((n) => n.name).sort()).toEqual([
      '@scope/pkg-a',
      '@scope/pkg-b',
    ])
  })

  it('should build edges for internal dependencies', () => {
    writePkg('pkg-a', {
      name: '@scope/pkg-a',
      version: '1.0.0',
      dependencies: { '@scope/pkg-b': '^1.0.0' },
    })
    writePkg('pkg-b', { name: '@scope/pkg-b', version: '1.0.0' })

    const graph = scanWorkspace(baseConfig)

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toEqual({
      source: '@scope/pkg-a',
      target: '@scope/pkg-b',
      depType: 'dependencies',
    })
  })

  it('should ignore external dependencies', () => {
    writePkg('pkg-a', {
      name: '@scope/pkg-a',
      version: '1.0.0',
      dependencies: { lodash: '^4.0.0' },
    })

    const graph = scanWorkspace(baseConfig)

    expect(graph.edges).toHaveLength(0)
  })

  it('should track dependency types correctly', () => {
    writePkg('pkg-a', {
      name: '@scope/pkg-a',
      version: '1.0.0',
      dependencies: { '@scope/pkg-b': '^1.0.0' },
      peerDependencies: { '@scope/pkg-c': '^1.0.0' },
      devDependencies: { '@scope/pkg-d': '^1.0.0' },
    })
    writePkg('pkg-b', { name: '@scope/pkg-b', version: '1.0.0' })
    writePkg('pkg-c', { name: '@scope/pkg-c', version: '1.0.0' })
    writePkg('pkg-d', { name: '@scope/pkg-d', version: '1.0.0' })

    const graph = scanWorkspace(baseConfig)

    expect(graph.edges).toHaveLength(3)
    expect(graph.edges.map((e) => e.depType).sort()).toEqual([
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ])
  })

  it('should filter by depTypes config', () => {
    writePkg('pkg-a', {
      name: '@scope/pkg-a',
      version: '1.0.0',
      dependencies: { '@scope/pkg-b': '^1.0.0' },
      devDependencies: { '@scope/pkg-c': '^1.0.0' },
    })
    writePkg('pkg-b', { name: '@scope/pkg-b', version: '1.0.0' })
    writePkg('pkg-c', { name: '@scope/pkg-c', version: '1.0.0' })

    const graph = scanWorkspace({
      ...baseConfig,
      depTypes: ['dependencies'],
    })

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]?.depType).toBe('dependencies')
  })

  it('should apply include filter', () => {
    writePkg('pkg-a', { name: '@scope/pkg-a', version: '1.0.0' })
    writePkg('pkg-b', { name: '@scope/pkg-b', version: '1.0.0' })

    const graph = scanWorkspace({
      ...baseConfig,
      include: ['@scope/pkg-a'],
    })

    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0]?.name).toBe('@scope/pkg-a')
  })

  it('should apply exclude filter', () => {
    writePkg('pkg-a', { name: '@scope/pkg-a', version: '1.0.0' })
    writePkg('pkg-b', { name: '@scope/pkg-b', version: '1.0.0' })

    const graph = scanWorkspace({
      ...baseConfig,
      exclude: ['@scope/pkg-b'],
    })

    expect(graph.nodes).toHaveLength(1)
    expect(graph.nodes[0]?.name).toBe('@scope/pkg-a')
  })

  it('should handle empty workspace', () => {
    const graph = scanWorkspace(baseConfig)
    expect(graph.nodes).toHaveLength(0)
    expect(graph.edges).toHaveLength(0)
  })

  it('should skip directories without package.json', () => {
    mkdirSync(join(tmpDir, 'packages', 'no-pkg'), { recursive: true })
    writePkg('pkg-a', { name: '@scope/pkg-a', version: '1.0.0' })

    const graph = scanWorkspace(baseConfig)
    expect(graph.nodes).toHaveLength(1)
  })

  it('should mark private packages', () => {
    writePkg('pkg-a', {
      name: '@scope/pkg-a',
      version: '1.0.0',
      private: true,
    })

    const graph = scanWorkspace(baseConfig)
    expect(graph.nodes[0]?.private).toBe(true)
  })
})
