import type { DepGraph, ImpactResult } from '../types'

export const analyzeImpact = (graph: DepGraph): ImpactResult => {
  // Build reverse adjacency: if A depends on B, then B's change impacts A
  const reverseAdj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    reverseAdj.set(node.name, [])
  }
  for (const edge of graph.edges) {
    reverseAdj.get(edge.target)?.push(edge.source)
  }

  const impactMap: Record<string, string[]> = {}

  for (const node of graph.nodes) {
    const visited = new Set<string>()
    const queue = [node.name]
    visited.add(node.name)

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const dependent of reverseAdj.get(current) ?? []) {
        if (!visited.has(dependent)) {
          visited.add(dependent)
          queue.push(dependent)
        }
      }
    }

    visited.delete(node.name)
    impactMap[node.name] = [...visited].sort()
  }

  return { impactMap }
}
