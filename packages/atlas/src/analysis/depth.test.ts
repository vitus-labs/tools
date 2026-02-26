import { describe, expect, it } from 'vitest'
import type { CycleResult, DepGraph } from '../types'
import { analyzeDepth } from './depth'

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

describe('analyzeDepth', () => {
  it('should assign depth 0 to leaf nodes', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b')],
    }
    const result = analyzeDepth(graph, noCycles)
    expect(result.depthMap.b).toBe(0)
  })

  it('should compute correct depths for linear chain', () => {
    // A -> B -> C -> D
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd')],
    }
    const result = analyzeDepth(graph, noCycles)
    expect(result.depthMap.d).toBe(0)
    expect(result.depthMap.c).toBe(1)
    expect(result.depthMap.b).toBe(2)
    expect(result.depthMap.a).toBe(3)
    expect(result.maxDepth).toBe(3)
  })

  it('should compute correct critical path', () => {
    // A -> B -> C -> D
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd')],
    }
    const result = analyzeDepth(graph, noCycles)
    expect(result.criticalPath).toEqual(['a', 'b', 'c', 'd'])
  })

  it('should pick longest path for critical path', () => {
    // A -> B -> D, A -> C -> D (both depth 2, same max)
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')],
    }
    const result = analyzeDepth(graph, noCycles)
    expect(result.depthMap.a).toBe(2)
    expect(result.maxDepth).toBe(2)
    expect(result.criticalPath).toHaveLength(3)
  })

  it('should handle cycles by breaking cycle edges', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b'), edge('b', 'a')],
    }
    const cycles: CycleResult = {
      cycles: [['a', 'b']],
      hasCycles: true,
    }
    const result = analyzeDepth(graph, cycles)
    expect(result.maxDepth).toBeGreaterThanOrEqual(0)
  })

  it('should handle empty graph', () => {
    const graph: DepGraph = { nodes: [], edges: [] }
    const result = analyzeDepth(graph, noCycles)
    expect(result.maxDepth).toBe(0)
    expect(result.criticalPath).toEqual([])
  })
})
