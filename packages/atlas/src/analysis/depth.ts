import type { CycleResult, DepGraph, DepthResult } from '../types'

export const analyzeDepth = (
  graph: DepGraph,
  cycles: CycleResult,
): DepthResult => {
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    adj.set(node.name, [])
  }

  // Collect cycle edges to ignore
  const cycleEdges = new Set<string>()
  for (const cycle of cycles.cycles) {
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i]!
      const to = cycle[(i + 1) % cycle.length]!
      cycleEdges.add(`${from}->${to}`)
    }
  }

  for (const edge of graph.edges) {
    const key = `${edge.source}->${edge.target}`
    if (!cycleEdges.has(key)) {
      adj.get(edge.source)?.push(edge.target)
    }
  }

  // Compute in-degrees for topological sort
  const inDegree = new Map<string, number>()
  for (const node of graph.nodes) {
    inDegree.set(node.name, 0)
  }
  for (const [, targets] of adj) {
    for (const t of targets) {
      inDegree.set(t, (inDegree.get(t) ?? 0) + 1)
    }
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = []
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name)
  }

  const topoOrder: string[] = []
  while (queue.length > 0) {
    const u = queue.shift()!
    topoOrder.push(u)
    for (const v of adj.get(u) ?? []) {
      const newDeg = (inDegree.get(v) ?? 1) - 1
      inDegree.set(v, newDeg)
      if (newDeg === 0) queue.push(v)
    }
  }

  // Compute depth: depth of a node = max depth of its dependencies + 1
  // We need reverse: depth of a node = how deep its dependency chain goes
  // Leaf nodes (no deps) have depth 0
  const depthMap: Record<string, number> = {}
  const predecessor = new Map<string, string | null>()

  for (const name of graph.nodes.map((n) => n.name)) {
    depthMap[name] = 0
    predecessor.set(name, null)
  }

  // Process in reverse topological order (dependencies before dependents)
  for (const u of [...topoOrder].reverse()) {
    for (const v of adj.get(u) ?? []) {
      const newDepth = (depthMap[v] ?? 0) + 1
      if (newDepth > (depthMap[u] ?? 0)) {
        depthMap[u] = newDepth
        predecessor.set(u, v)
      }
    }
  }

  // Find max depth and reconstruct critical path
  let maxDepth = 0
  let maxNode = ''
  for (const [name, depth] of Object.entries(depthMap)) {
    if (depth > maxDepth) {
      maxDepth = depth
      maxNode = name
    }
  }

  const criticalPath: string[] = []
  if (maxNode) {
    let current: string | null | undefined = maxNode
    while (current) {
      criticalPath.push(current)
      current = predecessor.get(current)
    }
  }

  return { depthMap, criticalPath, maxDepth }
}
