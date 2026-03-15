import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type {
  AtlasConfig,
  DepEdge,
  DepGraph,
  DepNode,
  DepType,
} from '../types.js'

interface PackageJson {
  name?: string
  version?: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

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
    return name === p || name.includes(p)
  })

const stripTrailingSlashes = (s: string): string => {
  let trimmed = s
  while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1)
  return trimmed
}

const listDirectories = (base: string): string[] => {
  try {
    return readdirSync(base)
      .map((entry) => join(base, entry))
      .filter((p) => {
        try {
          return statSync(p).isDirectory()
        } catch {
          return false
        }
      })
  } catch {
    return []
  }
}

const resolveWorkspaceDirs = (workspaces: string[], cwd: string): string[] => {
  return workspaces.flatMap((pattern) => {
    const starIdx = pattern.indexOf('*')
    const stripped = starIdx >= 0 ? pattern.slice(0, starIdx) : pattern
    const base = resolve(cwd, stripTrailingSlashes(stripped))
    return listDirectories(base)
  })
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

    nodes.push({
      name: pkg.name,
      version: pkg.version ?? '0.0.0',
      path: dir,
      private: pkg.private ?? false,
    })

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

const collectEdges = (
  nodes: DepNode[],
  pkgDeps: Map<string, { deps: Record<string, string>; depType: DepType }[]>,
): DepEdge[] => {
  const nodeNames = new Set(nodes.map((n) => n.name))
  const edges: DepEdge[] = []

  for (const [source, depEntries] of pkgDeps) {
    for (const { deps, depType } of depEntries) {
      for (const target of Object.keys(deps)) {
        if (nodeNames.has(target) && target !== source) {
          edges.push({ source, target, depType })
        }
      }
    }
  }

  return edges
}

export const scanWorkspace = (config: AtlasConfig): DepGraph => {
  const cwd = process.cwd()
  const dirs = resolveWorkspaceDirs(config.workspaces, cwd)
  const { nodes, pkgDeps } = collectNodes(dirs, config)
  const edges = collectEdges(nodes, pkgDeps)

  return { nodes, edges }
}
