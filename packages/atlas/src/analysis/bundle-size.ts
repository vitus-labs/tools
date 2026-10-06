import { type Dirent, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { BundleSizeResult, DepGraph } from '../types.ts'

const MAX_DIR_DEPTH = 20

const dirSize = (dir: string, depth = 0): number => {
  if (depth > MAX_DIR_DEPTH) return 0
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  let total = 0
  for (const entry of entries) {
    // Symlinks are not followed: avoids cycles and double counting.
    if (entry.isSymbolicLink()) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += dirSize(fullPath, depth + 1)
    } else if (entry.isFile()) {
      try {
        total += statSync(fullPath).size
      } catch {
        // unreadable entry — skip, keep counting the rest
      }
    }
  }
  return total
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

  // Transitive size (own + all reachable deps), counting each package once.
  // Iterative per-node traversal with only cached own sizes — correct with
  // cycles, no repeated filesystem reads.
  const transitiveSize = (start: string): number => {
    const visited = new Set<string>([start])
    const stack = [start]
    let total = 0
    while (stack.length > 0) {
      const name = stack.pop() as string
      total += ownSizes.get(name) ?? 0
      for (const dep of adj.get(name) ?? []) {
        if (!visited.has(dep)) {
          visited.add(dep)
          stack.push(dep)
        }
      }
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
