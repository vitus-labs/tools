import type { CycleResult, DepGraph } from '../types'

const WHITE = 0
const GRAY = 1
const BLACK = 2

const normalizeCycle = (cycle: string[]): string[] => {
  let minIdx = 0
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i]! < cycle[minIdx]!) minIdx = i
  }
  return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)]
}

export const detectCycles = (graph: DepGraph): CycleResult => {
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    adj.set(node.name, [])
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
  }

  const color = new Map<string, number>()
  const parent = new Map<string, string | null>()
  const cycles: string[][] = []
  const seen = new Set<string>()

  for (const node of graph.nodes) {
    color.set(node.name, WHITE)
  }

  const dfs = (u: string) => {
    color.set(u, GRAY)
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        const cycle: string[] = []
        let curr: string | null | undefined = u
        while (curr && curr !== v) {
          cycle.unshift(curr)
          curr = parent.get(curr)
        }
        cycle.unshift(v)
        const normalized = normalizeCycle(cycle)
        const key = normalized.join(' -> ')
        if (!seen.has(key)) {
          seen.add(key)
          cycles.push(normalized)
        }
      } else if (color.get(v) === WHITE) {
        parent.set(v, u)
        dfs(v)
      }
    }
    color.set(u, BLACK)
  }

  for (const node of graph.nodes) {
    if (color.get(node.name) === WHITE) {
      parent.set(node.name, null)
      dfs(node.name)
    }
  }

  return { cycles, hasCycles: cycles.length > 0 }
}
