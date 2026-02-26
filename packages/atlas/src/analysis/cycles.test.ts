import { describe, expect, it } from 'vitest'
import type { DepGraph } from '../types'
import { detectCycles } from './cycles'

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

describe('detectCycles', () => {
  it('should detect a simple A->B->A cycle', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [edge('a', 'b'), edge('b', 'a')],
    }
    const result = detectCycles(graph)
    expect(result.hasCycles).toBe(true)
    expect(result.cycles).toHaveLength(1)
    expect(result.cycles[0]).toContain('a')
    expect(result.cycles[0]).toContain('b')
  })

  it('should return no cycles for a DAG', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('a', 'b'), edge('b', 'c')],
    }
    const result = detectCycles(graph)
    expect(result.hasCycles).toBe(false)
    expect(result.cycles).toHaveLength(0)
  })

  it('should detect a cycle of length 3', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')],
    }
    const result = detectCycles(graph)
    expect(result.hasCycles).toBe(true)
    expect(result.cycles).toHaveLength(1)
    expect(result.cycles[0]).toHaveLength(3)
  })

  it('should detect multiple independent cycles', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('a', 'b'), edge('b', 'a'), edge('c', 'd'), edge('d', 'c')],
    }
    const result = detectCycles(graph)
    expect(result.hasCycles).toBe(true)
    expect(result.cycles).toHaveLength(2)
  })

  it('should handle graph with no edges', () => {
    const graph: DepGraph = {
      nodes: [node('a'), node('b')],
      edges: [],
    }
    const result = detectCycles(graph)
    expect(result.hasCycles).toBe(false)
  })

  it('should handle empty graph', () => {
    const graph: DepGraph = { nodes: [], edges: [] }
    const result = detectCycles(graph)
    expect(result.hasCycles).toBe(false)
    expect(result.cycles).toHaveLength(0)
  })
})
