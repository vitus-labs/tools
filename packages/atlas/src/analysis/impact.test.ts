import { describe, expect, it } from 'vitest'
import type { DepGraph } from '../types'
import { analyzeImpact } from './impact'

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

describe('analyzeImpact', () => {
  it('should find all transitive dependents', () => {
    // A -> B -> C (changing C impacts B and A)
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('a', 'b'), edge('b', 'c')],
    }
    const result = analyzeImpact(graph)
    expect(result.impactMap.c).toEqual(['a', 'b'])
    expect(result.impactMap.b).toEqual(['a'])
    expect(result.impactMap.a).toEqual([])
  })

  it('should handle diamond dependencies', () => {
    // A -> B, A -> C, B -> D, C -> D
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')],
    }
    const result = analyzeImpact(graph)
    expect(result.impactMap.d?.sort()).toEqual(['a', 'b', 'c'])
  })

  it('should return empty arrays for leaf packages', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b')],
    }
    const result = analyzeImpact(graph)
    expect(result.impactMap.a).toEqual([])
  })

  it('should handle isolated nodes', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [],
    }
    const result = analyzeImpact(graph)
    expect(result.impactMap.a).toEqual([])
    expect(result.impactMap.b).toEqual([])
  })
})
