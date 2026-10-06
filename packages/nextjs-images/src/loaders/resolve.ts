import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * Resolve a module the way a project located at `base` would (isolated
 * installs, e.g. pnpm/bun, only expose a project's direct dependencies), and
 * fall back to this package's own resolution. Returns undefined when the
 * module cannot be found.
 *
 * `base` is normalized with path.resolve(); it defaults to process.cwd().
 */
const resolveFromProject = (
  name: string,
  base?: string,
): string | undefined => {
  const root = path.resolve(base ?? process.cwd())

  try {
    return createRequire(path.join(root, 'noop.js')).resolve(name)
  } catch {
    // fall through to this package's own resolution
  }

  try {
    return createRequire(import.meta.url).resolve(name)
  } catch {
    return undefined
  }
}

/**
 * Resolve a loader that is a dependency of this package to an absolute path,
 * so webpack finds it even when it is not hoisted into the user's project.
 * Falls back to the bare name (resolved by webpack) when it cannot be found.
 */
const resolveOwnLoader = (name: string): string => {
  try {
    return createRequire(import.meta.url).resolve(name)
  } catch {
    return name
  }
}

export { resolveFromProject, resolveOwnLoader }
