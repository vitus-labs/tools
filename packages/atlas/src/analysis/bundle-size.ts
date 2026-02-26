import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { BundleSizeResult, DepGraph } from '../types'

const dirSize = (dir: string): number => {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    let total = 0
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        total += dirSize(fullPath)
      } else {
        total += statSync(fullPath).size
      }
    }
    return total
  } catch {
    return 0
  }
}

export const analyzeBundleSize = (graph: DepGraph): BundleSizeResult => {
  const adj = new Map<string, string[]>()
  const nodePathMap = new Map<string, string>()

  for (const node of graph.nodes) {
    adj.set(node.name, [])
    nodePathMap.set(node.name, node.path)
  }
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push(edge.target)
  }

  // Compute own lib size for each package
  const ownSizes = new Map<string, number>()
  for (const node of graph.nodes) {
    ownSizes.set(node.name, dirSize(join(node.path, 'lib')))
  }

  // Compute transitive size (own + all transitive deps)
  const transitiveSize = (
    name: string,
    visited = new Set<string>(),
  ): number => {
    if (visited.has(name)) return 0
    visited.add(name)
    let total = ownSizes.get(name) ?? 0
    for (const dep of adj.get(name) ?? []) {
      total += transitiveSize(dep, visited)
    }
    return total
  }

  const sizeMap: BundleSizeResult['sizeMap'] = {}
  for (const node of graph.nodes) {
    sizeMap[node.name] = {
      libSize: ownSizes.get(node.name) ?? 0,
      transitiveSize: transitiveSize(node.name),
    }
  }

  return { sizeMap }
}
