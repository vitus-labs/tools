import { existsSync } from 'node:fs'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

/**
 * Resolve an extensionless source path to a real file. Tries `<path>.<ext>`
 * first, then `<path>/index.<ext>` (directory entries such as
 * `src/devtools/index.ts`). Falls back to `<path>.ts` when nothing exists.
 */
const resolveSourceFile = (path: string): string => {
  for (const ext of SOURCE_EXTENSIONS) {
    if (existsSync(`${path}${ext}`)) return `${path}${ext}`
  }
  for (const ext of SOURCE_EXTENSIONS) {
    if (existsSync(`${path}/index${ext}`)) return `${path}/index${ext}`
  }
  return `${path}.ts`
}

/**
 * Reduce an export condition value to a file path. Handles plain strings and
 * nested condition objects (`import: { types, default }`) by following
 * `default`, then `import`, then `require`.
 */
const flattenCondition = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined
  const obj = value as Record<string, unknown>
  for (const key of ['default', 'import', 'require']) {
    const found = flattenCondition(obj[key])
    if (found) return found
  }
  return undefined
}

/** Wildcard subpath patterns (`./features/*`) can't map to a single entry. */
const isWildcardSubpath = (exportPath: string): boolean =>
  exportPath.includes('*')

export { flattenCondition, isWildcardSubpath, resolveSourceFile }
