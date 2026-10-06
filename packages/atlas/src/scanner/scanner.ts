import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { globSync } from 'tinyglobby'
import type {
  AtlasConfig,
  DepEdge,
  DepGraph,
  DepNode,
  DepType,
} from '../types.ts'
import { manifests, type PackageJson } from './manifests.ts'

const DEP_TYPE_PRIORITY: DepType[] = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
]

const readPackageJson = (dir: string): PackageJson | null => {
  try {
    const raw = readFileSync(join(dir, 'package.json'), 'utf-8')
    return JSON.parse(raw) as PackageJson
  } catch {
    return null
  }
}

/** Escape special regex characters except `*` which we handle separately. */
const escapeRegExp = (s: string): string =>
  s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

const matchesAny = (name: string, patterns: string[]): boolean =>
  patterns.some((p) => {
    if (p.includes('*')) {
      const regex = new RegExp(`^${escapeRegExp(p).replace(/\*/g, '.*')}$`)
      return regex.test(name)
    }
    return name === p
  })

const stripTrailingSlashes = (s: string): string => {
  let trimmed = s
  while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1)
  return trimmed
}

const normalizePattern = (pattern: string): string => {
  let p = stripTrailingSlashes(pattern.trim())
  while (p.startsWith('./')) p = p.slice(2)
  return p
}

/**
 * Resolve workspace globs to package directories. Each positive pattern
 * matches `<pattern>/package.json`; `!`-prefixed patterns exclude.
 */
const resolveWorkspaceDirs = (workspaces: string[], cwd: string): string[] => {
  const include: string[] = []
  const ignore: string[] = ['**/node_modules/**']
  for (const raw of workspaces) {
    if (raw.startsWith('!')) {
      const neg = normalizePattern(raw.slice(1))
      if (neg) ignore.push(neg, `${neg}/**`)
      continue
    }
    const p = normalizePattern(raw)
    if (!p) continue
    include.push(p.endsWith('package.json') ? p : `${p}/package.json`)
  }
  if (include.length === 0) return []

  const files = globSync(include, {
    cwd,
    ignore,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: true,
  })
  return [...new Set(files.map((f) => dirname(f)))].sort()
}

const shouldIncludePackage = (name: string, config: AtlasConfig): boolean => {
  if (config.include.length > 0 && !matchesAny(name, config.include))
    return false
  if (config.exclude.length > 0 && matchesAny(name, config.exclude))
    return false
  return true
}

const collectNodes = (
  dirs: string[],
  config: AtlasConfig,
): {
  nodes: DepNode[]
  pkgDeps: Map<string, { deps: Record<string, string>; depType: DepType }[]>
} => {
  const nodes: DepNode[] = []
  const pkgDeps = new Map<
    string,
    { deps: Record<string, string>; depType: DepType }[]
  >()

  for (const dir of dirs) {
    const pkg = readPackageJson(dir)
    if (!pkg?.name) continue
    if (!shouldIncludePackage(pkg.name, config)) continue

    const node: DepNode = {
      name: pkg.name,
      version: pkg.version ?? '0.0.0',
      path: dir,
      private: pkg.private ?? false,
    }
    nodes.push(node)
    manifests.set(node, pkg)

    const depEntries: { deps: Record<string, string>; depType: DepType }[] = []
    for (const depType of config.depTypes) {
      const deps = pkg[depType]
      if (deps) {
        depEntries.push({ deps, depType })
      }
    }
    pkgDeps.set(pkg.name, depEntries)
  }

  return { nodes, pkgDeps }
}

type MergedEdge = { source: string; target: string; types: Set<DepType> }

const addEdge = (
  merged: Map<string, MergedEdge>,
  source: string,
  target: string,
  depType: DepType,
): void => {
  const key = `${source}\u0000${target}`
  const entry = merged.get(key)
  if (entry) entry.types.add(depType)
  else merged.set(key, { source, target, types: new Set([depType]) })
}

const collectEdges = (
  nodes: DepNode[],
  pkgDeps: Map<string, { deps: Record<string, string>; depType: DepType }[]>,
): DepEdge[] => {
  const nodeNames = new Set(nodes.map((n) => n.name))
  // One edge per (source, target); the set of dep types it appears under
  // is kept in `depTypes`, `depType` is the strongest one.
  const merged = new Map<string, MergedEdge>()

  for (const [source, depEntries] of pkgDeps) {
    for (const { deps, depType } of depEntries) {
      for (const target of Object.keys(deps)) {
        if (nodeNames.has(target) && target !== source) {
          addEdge(merged, source, target, depType)
        }
      }
    }
  }

  return [...merged.values()].map(({ source, target, types }) => {
    const depTypes = DEP_TYPE_PRIORITY.filter((t) => types.has(t))
    return { source, target, depType: depTypes[0] as DepType, depTypes }
  })
}

export const scanWorkspace = (config: AtlasConfig): DepGraph => {
  const cwd = process.cwd()
  const dirs = resolveWorkspaceDirs(config.workspaces, cwd)
  const { nodes, pkgDeps } = collectNodes(dirs, config)
  const edges = collectEdges(nodes, pkgDeps)

  return { nodes, edges }
}
