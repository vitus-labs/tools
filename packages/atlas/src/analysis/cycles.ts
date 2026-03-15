import type { CycleResult, DepGraph } from '../types.js'

const WHITE = 0
const GRAY = 1
const BLACK = 2

const normalizeCycle = (cycle: string[]): string[] => {
  let minIdx = 0
  for (let i = 1; i < cycle.length; i++) {
    if ((cycle[i] as string) < (cycle[minIdx] as string)) minIdx = i
  }
  return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)]
}

const buildAdjacencyMap = (graph: DepGraph): Map<string, string[]> => {
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) {
    adj.set(node.name, [])
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
  }
  return adj
}

const reconstructCycle = (
  u: string,
  v: string,
  parent: Map<string, string | null>,
): string[] => {
  const cycle: string[] = []
  let curr: string | null | undefined = u
  while (curr && curr !== v) {
    cycle.unshift(curr)
    curr = parent.get(curr)
  }
  cycle.unshift(v)
  return cycle
}

const tryRecordCycle = (
  u: string,
  v: string,
  parent: Map<string, string | null>,
  seen: Set<string>,
  cycles: string[][],
) => {
  const cycle = reconstructCycle(u, v, parent)
  const normalized = normalizeCycle(cycle)
  const key = normalized.join(' -> ')
  if (!seen.has(key)) {
    seen.add(key)
    cycles.push(normalized)
  }
}

export const detectCycles = (graph: DepGraph): CycleResult => {
  const adj = buildAdjacencyMap(graph)

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
        tryRecordCycle(u, v, parent, seen, cycles)
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
