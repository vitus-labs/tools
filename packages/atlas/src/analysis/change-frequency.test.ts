import { execFileSync } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import type { DepGraph, ImpactResult } from '../types'
import { analyzeChangeFrequency } from './change-frequency'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

const mockedExecFileSync = vi.mocked(execFileSync)

const node = (name: string) => ({
  name,
  version: '1.0.0',
  path: `/packages/${name}`,
  private: false,
})

const graph: DepGraph = {
  nodes: [node('a')],
  edges: [],
}

const impact: ImpactResult = { impactMap: { a: [] } }

const setupGitMock = () => {
  mockedExecFileSync.mockImplementation((_cmd: string, args?: string[]) => {
    const argsStr = (args ?? []).join(' ')
    if (argsStr.includes('rev-parse')) return ''
    if (argsStr.includes('--since'))
      return Array.from({ length: 12 }, (_, i) => `hash${i}`).join('\n')
    if (argsStr.includes('--format=%cI')) return '2026-02-20T10:00:00+01:00'
    return ''
  })
}

describe('analyzeChangeFrequency', () => {
  it('should return null when not in a git repo', () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error('not a git repo')
    })

    const result = analyzeChangeFrequency(graph, impact)
    expect(result).toBeNull()
  })

  it('should count commits per package', () => {
    setupGitMock()

    const result = analyzeChangeFrequency(graph, impact)
    expect(result).not.toBeNull()
    expect(result?.frequencyMap.a?.commits).toBe(12)
  })

  it('should extract last changed date', () => {
    setupGitMock()

    const result = analyzeChangeFrequency(graph, impact)
    expect(result?.frequencyMap.a?.lastChanged).toContain('2026-02-20')
  })

  it('should handle git log failure for a package gracefully', () => {
    mockedExecFileSync.mockImplementation((_cmd: string, args?: string[]) => {
      const argsStr = (args ?? []).join(' ')
      if (argsStr.includes('rev-parse')) return ''
      throw new Error('git log failed')
    })

    const result = analyzeChangeFrequency(graph, impact)
    expect(result).not.toBeNull()
    expect(result?.frequencyMap.a).toEqual({ commits: 0, lastChanged: '' })
  })

  it('should identify hotspots', () => {
    setupGitMock()

    const multiGraph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [],
    }
    const multiImpact: ImpactResult = {
      impactMap: { a: ['b', 'c', 'd'], b: [], c: [], d: [] },
    }

    const result = analyzeChangeFrequency(multiGraph, multiImpact)
    expect(result?.hotspots).toContain('a')
  })
})
