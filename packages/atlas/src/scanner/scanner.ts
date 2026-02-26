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

export const scanWorkspace = (config: AtlasConfig): DepGraph => {
  const cwd = process.cwd()
  const dirs = config.workspaces.flatMap((pattern) => {
    const starIdx = pattern.indexOf('*')
    const stripped = starIdx >= 0 ? pattern.slice(0, starIdx) : pattern
    // Strip trailing slashes without regex (avoids polynomial-regex CodeQL alert)
    let trimmed = stripped
    while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1)
    const base = resolve(cwd, trimmed)
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
  })

  const nodes: DepNode[] = []
  const pkgDeps = new Map<
    string,
    { deps: Record<string, string>; depType: DepType }[]
  >()

  for (const dir of dirs) {
    const pkg = readPackageJson(dir)
    if (!pkg?.name) continue

    if (config.include.length > 0 && !matchesAny(pkg.name, config.include))
      continue
    if (config.exclude.length > 0 && matchesAny(pkg.name, config.exclude))
      continue

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

  return { nodes, edges }
}
