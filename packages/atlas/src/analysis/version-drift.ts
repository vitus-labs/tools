import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DepGraph, VersionDriftResult } from '../types'

export const detectVersionDrift = (graph: DepGraph): VersionDriftResult => {
  // Map: external dep name -> { version -> [packages using this version] }
  const versionMap = new Map<string, Map<string, string[]>>()
  const nodeNames = new Set(graph.nodes.map((n) => n.name))

  for (const node of graph.nodes) {
    let pkg: Record<string, Record<string, string> | undefined>
    try {
      pkg = JSON.parse(readFileSync(join(node.path, 'package.json'), 'utf-8'))
    } catch {
      continue
    }

    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ] as const) {
      const deps = pkg[field]
      if (!deps) continue

      for (const [depName, version] of Object.entries(deps)) {
        // Skip internal workspace deps
        if (nodeNames.has(depName)) continue

        if (!versionMap.has(depName)) {
          versionMap.set(depName, new Map())
        }
        const versions = versionMap.get(depName)!
        if (!versions.has(version)) {
          versions.set(version, [])
        }
        versions.get(version)?.push(node.name)
      }
    }
  }

  const drifts: VersionDriftResult['drifts'] = []

  for (const [dependency, versions] of versionMap) {
    if (versions.size > 1) {
      const versionRecord: Record<string, string[]> = {}
      for (const [version, packages] of versions) {
        versionRecord[version] = packages.sort()
      }
      drifts.push({ dependency, versions: versionRecord })
    }
  }

  drifts.sort((a, b) => a.dependency.localeCompare(b.dependency))

  return { drifts, hasDrifts: drifts.length > 0 }
}
