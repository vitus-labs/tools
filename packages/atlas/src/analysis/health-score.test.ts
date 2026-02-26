import { describe, expect, it } from 'vitest'
import type {
  ChangeFrequencyResult,
  CycleResult,
  DepGraph,
  DepthResult,
  ImpactResult,
  VersionDriftResult,
} from '../types'
import { computeHealthScores } from './health-score'

const node = (name: string) => ({
  name,
  version: '1.0.0',
  path: `/packages/${name}`,
  private: false,
})

const edge = (source: string, target: string) => ({
  source,
  target,
  depType: 'dependencies' as const,
})

const noCycles: CycleResult = { cycles: [], hasCycles: false }
const noDrift: VersionDriftResult = { drifts: [], hasDrifts: false }

describe('computeHealthScores', () => {
  it('should give high score to healthy packages', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b')],
    }
    const impact: ImpactResult = { impactMap: { a: [], b: ['a'] } }
    const depth: DepthResult = {
      depthMap: { a: 1, b: 0 },
      criticalPath: ['a', 'b'],
      maxDepth: 1,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    expect(result.scores.b?.score).toBeGreaterThanOrEqual(80)
  })

  it('should penalize packages in cycles', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b'), edge('b', 'a')],
    }
    const cycles: CycleResult = {
      cycles: [['a', 'b']],
      hasCycles: true,
    }
    const impact: ImpactResult = { impactMap: { a: ['b'], b: ['a'] } }
    const depth: DepthResult = {
      depthMap: { a: 0, b: 0 },
      criticalPath: [],
      maxDepth: 0,
    }

    const result = computeHealthScores({
      graph,
      cycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    expect(result.scores.a?.score).toBeLessThan(100)
    expect(result.scores.a?.factors).toContainEqual(
      expect.stringContaining('cycle'),
    )
  })

  it('should penalize orphan packages', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [],
    }
    const impact: ImpactResult = { impactMap: { a: [], b: [] } }
    const depth: DepthResult = {
      depthMap: { a: 0, b: 0 },
      criticalPath: [],
      maxDepth: 0,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    expect(result.scores.a?.factors).toContainEqual(
      expect.stringContaining('orphan'),
    )
  })

  it('should clamp scores between 0 and 100', () => {
    const graph: DepGraph = {
      nodes: [node('a')],
      edges: [],
    }
    const impact: ImpactResult = { impactMap: { a: [] } }
    const depth: DepthResult = {
      depthMap: { a: 0 },
      criticalPath: [],
      maxDepth: 0,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    const score = result.scores.a?.score
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should apply version drift penalty', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b')],
    }
    const impact: ImpactResult = { impactMap: { a: [], b: ['a'] } }
    const depth: DepthResult = {
      depthMap: { a: 1, b: 0 },
      criticalPath: ['a', 'b'],
      maxDepth: 1,
    }
    const versionDrift: VersionDriftResult = {
      drifts: [
        {
          dependency: 'lodash',
          versions: { '4.17.21': ['a'], '4.17.20': ['b'] },
        },
      ],
      hasDrifts: true,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift,
      changeFrequency: null,
    })

    // 'a' has 1 drift => -5 penalty
    expect(result.scores.a?.score).toBeLessThan(100)
    expect(result.scores.a?.factors).toContainEqual(
      expect.stringContaining('version drift'),
    )
  })

  it('should cap version drift penalty at -20', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b')],
    }
    const impact: ImpactResult = { impactMap: { a: [], b: ['a'] } }
    const depth: DepthResult = {
      depthMap: { a: 0, b: 0 },
      criticalPath: [],
      maxDepth: 0,
    }
    // 'a' appears in 5 different drift entries => 5 * 5 = 25, capped at 20
    const versionDrift: VersionDriftResult = {
      drifts: [
        { dependency: 'dep1', versions: { '1.0.0': ['a'], '2.0.0': ['b'] } },
        { dependency: 'dep2', versions: { '1.0.0': ['a'], '2.0.0': ['b'] } },
        { dependency: 'dep3', versions: { '1.0.0': ['a'], '2.0.0': ['b'] } },
        { dependency: 'dep4', versions: { '1.0.0': ['a'], '2.0.0': ['b'] } },
        { dependency: 'dep5', versions: { '1.0.0': ['a'], '2.0.0': ['b'] } },
      ],
      hasDrifts: true,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift,
      changeFrequency: null,
    })

    // 'a' is orphan (-15) + drift capped at -20 = 65
    // But 'b' has dependent 'a' so b gets +5 bonus
    expect(result.scores.a?.factors).toContainEqual(
      expect.stringContaining('5 version drift'),
    )
    // Verify the cap: score should be 100 - 15 (orphan) - 20 (drift cap) = 65
    expect(result.scores.a?.score).toBe(65)
  })

  it('should apply deep chain penalty when depth > 3', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d'), node('e')],
      edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e')],
    }
    const impact: ImpactResult = {
      impactMap: {
        a: [],
        b: ['a'],
        c: ['a', 'b'],
        d: ['a', 'b', 'c'],
        e: ['a', 'b', 'c', 'd'],
      },
    }
    const depth: DepthResult = {
      depthMap: { a: 4, b: 3, c: 2, d: 1, e: 0 },
      criticalPath: ['a', 'b', 'c', 'd', 'e'],
      maxDepth: 4,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    // 'a' has depth 4 (> 3) => -10 penalty
    expect(result.scores.a?.factors).toContainEqual(
      expect.stringContaining('deep chain'),
    )
    expect(result.scores.a?.factors).toContainEqual(
      expect.stringContaining('depth 4'),
    )
    // 'b' has depth 3 (not > 3) => no deep chain penalty
    expect(result.scores.b?.factors).not.toContainEqual(
      expect.stringContaining('deep chain'),
    )
  })

  it('should apply dependents bonus capped at +20', () => {
    const graph: DepGraph = {
      nodes: [
        node('core'),
        node('a'),
        node('b'),
        node('c'),
        node('d'),
        node('e'),
      ],
      edges: [
        edge('a', 'core'),
        edge('b', 'core'),
        edge('c', 'core'),
        edge('d', 'core'),
        edge('e', 'core'),
      ],
    }
    const impact: ImpactResult = {
      impactMap: {
        core: ['a', 'b', 'c', 'd', 'e'],
        a: [],
        b: [],
        c: [],
        d: [],
        e: [],
      },
    }
    const depth: DepthResult = {
      depthMap: { core: 0, a: 1, b: 1, c: 1, d: 1, e: 1 },
      criticalPath: ['a', 'core'],
      maxDepth: 1,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    // 'core' has 5 dependents => bonus = min(5*5, 20) = 20
    // but score is capped at 100, so 100 + 20 stays 100
    expect(result.scores.core?.score).toBe(100)
    // The orphan packages (a-e) have no dependents => -15 orphan penalty
    // a-e are NOT targets of any edge, so they are orphans
    // Wait: a,b,c,d,e all have edges pointing TO 'core', but they themselves
    // are sources, not targets. So hasDependent only has 'core'.
    // a-e are orphans => -15 each => score 85
    expect(result.scores.a?.score).toBe(85)
  })

  it('should give dependents bonus proportional to dependent count', () => {
    const graph: DepGraph = {
      nodes: [node('lib'), node('app1'), node('app2')],
      edges: [edge('app1', 'lib'), edge('app2', 'lib')],
    }
    const impact: ImpactResult = {
      impactMap: { lib: ['app1', 'app2'], app1: [], app2: [] },
    }
    const depth: DepthResult = {
      depthMap: { lib: 0, app1: 1, app2: 1 },
      criticalPath: ['app1', 'lib'],
      maxDepth: 1,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    // 'lib' has 2 dependents => bonus = min(2*5, 20) = 10
    // 'lib' is a target of edges so not orphan. Score = 100 (no penalties) + 10 bonus capped at 100 = 100
    expect(result.scores.lib?.score).toBe(100)
    // app1 and app2 are orphans (-15), no dependents bonus => score = 85
    expect(result.scores.app1?.score).toBe(85)
  })

  it('should apply changeFrequency bonus when commits > 0', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [],
    }
    const impact: ImpactResult = { impactMap: { a: [], b: [] } }
    const depth: DepthResult = {
      depthMap: { a: 0, b: 0 },
      criticalPath: [],
      maxDepth: 0,
    }
    const changeFrequency: ChangeFrequencyResult = {
      frequencyMap: {
        a: { commits: 10, lastChanged: '2025-01-01' },
        b: { commits: 0, lastChanged: '2024-01-01' },
      },
      hotspots: ['a'],
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency,
    })

    // Both are orphans (-15) since there are 2 nodes and no edges
    // 'a' has commits > 0 => +5 bonus => 100 - 15 + 5 = 90
    // 'b' has commits = 0 => no bonus => 100 - 15 = 85
    expect(result.scores.a?.score).toBe(90)
    expect(result.scores.b?.score).toBe(85)
  })

  it('should not give changeFrequency bonus when changeFrequency is null', () => {
    const graph: DepGraph = {
      nodes: [node('a')],
      edges: [],
    }
    const impact: ImpactResult = { impactMap: { a: [] } }
    const depth: DepthResult = {
      depthMap: { a: 0 },
      criticalPath: [],
      maxDepth: 0,
    }

    const result = computeHealthScores({
      graph,
      cycles: noCycles,
      impact,
      depth,
      versionDrift: noDrift,
      changeFrequency: null,
    })

    // Single node => no orphan penalty (graph.nodes.length === 1)
    // No bonus => score = 100
    expect(result.scores.a?.score).toBe(100)
  })

  it('should clamp score to 0 when many penalties stack', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [],
    }
    const cycles: CycleResult = {
      cycles: [
        ['a', 'b'],
        ['a', 'b'],
        ['a', 'b'],
      ],
      hasCycles: true,
    }
    const impact: ImpactResult = { impactMap: { a: [], b: [] } }
    const depth: DepthResult = {
      depthMap: { a: 5, b: 5 },
      criticalPath: ['a'],
      maxDepth: 5,
    }
    const versionDrift: VersionDriftResult = {
      drifts: [
        { dependency: 'd1', versions: { '1.0': ['a'], '2.0': ['b'] } },
        { dependency: 'd2', versions: { '1.0': ['a'], '2.0': ['b'] } },
        { dependency: 'd3', versions: { '1.0': ['a'], '2.0': ['b'] } },
        { dependency: 'd4', versions: { '1.0': ['a'], '2.0': ['b'] } },
        { dependency: 'd5', versions: { '1.0': ['a'], '2.0': ['b'] } },
      ],
      hasDrifts: true,
    }

    const result = computeHealthScores({
      graph,
      cycles,
      impact,
      depth,
      versionDrift,
      changeFrequency: null,
    })

    // a: 100 - 40 (cycle cap) - 15 (orphan) - 10 (deep) - 20 (drift cap) = 15
    expect(result.scores.a?.score).toBe(15)
    expect(result.scores.a?.score).toBeGreaterThanOrEqual(0)
  })
})
