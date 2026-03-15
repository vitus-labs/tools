import type { CycleResult, DepGraph, DepthResult } from '../types.js'

const collectCycleEdges = (cycles: CycleResult): Set<string> => {
  const cycleEdges = new Set<string>()
  for (const cycle of cycles.cycles) {
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i] as string
      const to = cycle[(i + 1) % cycle.length] as string
      cycleEdges.add(`${from}->${to}`)
    }
  }
  return cycleEdges
}

const buildAcyclicAdj = (
  graph: DepGraph,
  cycleEdges: Set<string>,
): Map<string, string[]> => {
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    adj.set(node.name, [])
  }
  for (const edge of graph.edges) {
    const key = `${edge.source}->${edge.target}`
    if (!cycleEdges.has(key)) {
      adj.get(edge.source)?.push(edge.target)
    }
  }
  return adj
}

const computeInDegrees = (
  graph: DepGraph,
  adj: Map<string, string[]>,
): Map<string, number> => {
  const inDegree = new Map<string, number>()
  for (const node of graph.nodes) {
    inDegree.set(node.name, 0)
  }
  for (const [, targets] of adj) {
    for (const t of targets) {
      inDegree.set(t, (inDegree.get(t) ?? 0) + 1)
    }
  }
  return inDegree
}

const topoSort = (graph: DepGraph, adj: Map<string, string[]>): string[] => {
  const inDegree = computeInDegrees(graph, adj)

  const queue: string[] = []
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name)
  }

  const topoOrder: string[] = []
  while (queue.length > 0) {
    const u = queue.shift() as string
    topoOrder.push(u)
    for (const v of adj.get(u) ?? []) {
      const newDeg = (inDegree.get(v) ?? 1) - 1
      inDegree.set(v, newDeg)
      if (newDeg === 0) queue.push(v)
    }
  }

  return topoOrder
}

const computeDepthMap = (
  graph: DepGraph,
  adj: Map<string, string[]>,
  topoOrder: string[],
): {
  depthMap: Record<string, number>
  predecessor: Map<string, string | null>
} => {
  const depthMap: Record<string, number> = {}
  const predecessor = new Map<string, string | null>()

  for (const name of graph.nodes.map((n) => n.name)) {
    depthMap[name] = 0
    predecessor.set(name, null)
  }

  for (const u of [...topoOrder].reverse()) {
    for (const v of adj.get(u) ?? []) {
      const newDepth = (depthMap[v] ?? 0) + 1
      if (newDepth > (depthMap[u] ?? 0)) {
        depthMap[u] = newDepth
        predecessor.set(u, v)
      }
    }
  }

  return { depthMap, predecessor }
}

const findCriticalPath = (
  depthMap: Record<string, number>,
  predecessor: Map<string, string | null>,
): { criticalPath: string[]; maxDepth: number } => {
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

  return { criticalPath, maxDepth }
}

export const analyzeDepth = (
  graph: DepGraph,
  cycles: CycleResult,
): DepthResult => {
  const cycleEdges = collectCycleEdges(cycles)
  const adj = buildAcyclicAdj(graph, cycleEdges)
  const topoOrder = topoSort(graph, adj)
  const { depthMap, predecessor } = computeDepthMap(graph, adj, topoOrder)
  const { criticalPath, maxDepth } = findCriticalPath(depthMap, predecessor)

  return { depthMap, criticalPath, maxDepth }
}
