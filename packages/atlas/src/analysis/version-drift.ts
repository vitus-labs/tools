import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DepGraph, VersionDriftResult } from '../types.js'

const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
] as const

const readPkg = (
  path: string,
): Record<string, Record<string, string> | undefined> | null => {
  try {
    return JSON.parse(readFileSync(join(path, 'package.json'), 'utf-8'))
  } catch {
    return null
  }
}

const collectDepsFromPkg = (
  pkg: Record<string, Record<string, string> | undefined>,
  nodeName: string,
  nodeNames: Set<string>,
  versionMap: Map<string, Map<string, string[]>>,
) => {
  for (const field of DEP_FIELDS) {
    const deps = pkg[field]
    if (!deps) continue

    for (const [depName, version] of Object.entries(deps)) {
      if (nodeNames.has(depName)) continue
      recordVersion(versionMap, depName, version, nodeName)
    }
  }
}

const recordVersion = (
  versionMap: Map<string, Map<string, string[]>>,
  depName: string,
  version: string,
  nodeName: string,
) => {
  if (!versionMap.has(depName)) {
    versionMap.set(depName, new Map())
  }
  const versions = versionMap.get(depName) as Map<string, string[]>
  if (!versions.has(version)) {
    versions.set(version, [])
  }
  versions.get(version)?.push(nodeName)
}

const buildDrifts = (
  versionMap: Map<string, Map<string, string[]>>,
): VersionDriftResult['drifts'] => {
  const drifts: VersionDriftResult['drifts'] = []

  for (const [dependency, versions] of versionMap) {
    if (versions.size <= 1) continue

    const versionRecord: Record<string, string[]> = {}
    for (const [version, packages] of versions) {
      versionRecord[version] = packages.sort()
    }
    drifts.push({ dependency, versions: versionRecord })
  }

  drifts.sort((a, b) => a.dependency.localeCompare(b.dependency))
  return drifts
}

export const detectVersionDrift = (graph: DepGraph): VersionDriftResult => {
  const versionMap = new Map<string, Map<string, string[]>>()
  const nodeNames = new Set(graph.nodes.map((n) => n.name))

  for (const node of graph.nodes) {
    const pkg = readPkg(node.path)
    if (!pkg) continue
    collectDepsFromPkg(pkg, node.name, nodeNames, versionMap)
  }

  const drifts = buildDrifts(versionMap)

  return { drifts, hasDrifts: drifts.length > 0 }
}
