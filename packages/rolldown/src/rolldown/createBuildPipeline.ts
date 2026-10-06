import { posix } from 'node:path'
import { CONFIG, PKG } from '../config/index.ts'
import {
  flattenCondition,
  isWildcardSubpath,
  resolveSourceFile,
} from './resolveEntry.ts'

const isESModuleOnly = PKG.type === 'module'

const hasDifferentNativeBuild = () => {
  return PKG['react-native'] !== PKG.module
}

/** Only the object form of `browser` maps files; string form and `false`
 *  (module ignored) values carry no build output. */
const getBrowserMap = (): [string, string][] => {
  const map = PKG.browser
  if (!map || typeof map !== 'object') return []
  return Object.entries(map as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[0].startsWith('./'),
  )
}

const hasDifferentBrowserBuild = (type: string) =>
  getBrowserMap().some(([key, value]) => {
    const source = key.substring(2)
    const output = value.substring(2)

    return source !== PKG[type] && source !== output
  })

const BUILD_VARIANTS: Record<
  string,
  { format: string; env: string; platform?: string }
> = {
  main: {
    format: isESModuleOnly ? 'es' : 'cjs',
    env: 'development',
    platform: 'universal',
  },
  module: {
    format: 'es',
    env: 'development',
    platform: 'universal',
  },
  'react-native': {
    format: 'es',
    env: 'development',
    platform: 'native',
  },
  'umd:main': { format: 'umd', env: 'development' },
  unpkg: { format: 'umd', env: 'production' },
}

/** Check if an exports object uses subpath keys (e.g. ".", "./devtools") */
const isSubpathExports = (obj: Record<string, any>): boolean =>
  Object.keys(obj).some((k) => k === '.' || k.startsWith('./'))

/** Resolve the source input file for a subpath export using convention:
 *  "." → "src/index.ts", "./devtools" → "src/devtools" */
const resolveSubpathInput = (exportPath: string): string => {
  if (exportPath === '.') return resolveSourceFile(`${CONFIG.sourceDir}/index`)
  const subpath = exportPath.slice(2) // strip "./"
  return `${CONFIG.sourceDir}/${subpath}`
}

/** Extract build variants from a single export's condition object */
const parseConditions = (
  conditions: Record<string, any>,
  input?: string,
): Record<string, any>[] => {
  const result: Record<string, any>[] = []
  const base = input ? { input } : {}
  const importFile = flattenCondition(conditions.import)
  const requireFile = flattenCondition(conditions.require)
  const nodeFile = flattenCondition(conditions.node)
  const defaultFile = flattenCondition(conditions.default)

  if (importFile) {
    result.push({ file: importFile, ...BUILD_VARIANTS.module, ...base })
  }
  if (requireFile) {
    result.push({
      file: requireFile,
      format: 'cjs',
      env: 'development',
      platform: 'universal',
      ...base,
    })
  }
  if (nodeFile) {
    result.push({
      file: nodeFile,
      ...BUILD_VARIANTS.module,
      platform: 'node',
      ...base,
    })
  }
  if (defaultFile && !importFile) {
    result.push({ file: defaultFile, ...BUILD_VARIANTS.module, ...base })
  }

  return result
}

/** Parse subpath exports object into build variants */
const parseSubpathExports = (
  exportsOptions: Record<string, any>,
): Record<string, any>[] => {
  const result: Record<string, any>[] = []

  for (const [exportPath, exportConfig] of Object.entries(exportsOptions)) {
    if (isWildcardSubpath(exportPath)) {
      console.warn(
        `[rolldown] Skipping wildcard export "${exportPath}" — patterns can't be mapped to a single entry; list the subpaths explicitly.`,
      )
      continue
    }
    if (typeof exportConfig === 'string') {
      // Skip passthrough exports (e.g. "./package.json": "./package.json")
      if (!exportConfig.endsWith('.js') && !exportConfig.endsWith('.mjs')) {
        continue
      }
      result.push({
        file: exportConfig,
        input: resolveSubpathInput(exportPath),
        ...BUILD_VARIANTS.module,
      })
    } else if (typeof exportConfig === 'object' && exportConfig !== null) {
      // exports without build conditions yield no variants
      const input = resolveSubpathInput(exportPath)
      result.push(...parseConditions(exportConfig, input))
    }
  }

  return result
}

const getExportsOptions = () => {
  const exportsOptions = PKG.exports

  if (!exportsOptions) return []

  if (typeof exportsOptions === 'string') {
    return [{ file: PKG.exports, ...BUILD_VARIANTS.module }]
  }

  if (typeof exportsOptions === 'object') {
    return isSubpathExports(exportsOptions)
      ? parseSubpathExports(exportsOptions)
      : parseConditions(exportsOptions)
  }

  return []
}

const createBasicBuildVariants = () => {
  let result: Record<string, any>[] = []

  if (isESModuleOnly) result = [...getExportsOptions()]

  Object.keys(BUILD_VARIANTS).forEach((key) => {
    const PKGOutDir = PKG[key]

    if (PKGOutDir) {
      const hasBrowserBuild = hasDifferentBrowserBuild(key)
      const hasNativeBuild = hasDifferentNativeBuild()

      // create a helper function for adding a build variant to an array
      const add = (props = {}) => {
        result.push({ ...BUILD_VARIANTS[key], file: PKGOutDir, ...props })
      }

      if (key === 'react-native') {
        // add a separate RN build only if output path differs from module path
        if (hasNativeBuild) {
          add()
        }
      } else if (hasBrowserBuild) {
        // if has a different browser build, set default platform to node
        // as there is going to be created a separate browser build as well
        add({ platform: 'node' })
      } else {
        add()
      }
    }
  })

  return result
}

const createBrowserBuildVariants = () => {
  const result: Record<string, any>[] = []
  getBrowserMap().forEach(([key, value]) => {
    const source = key.substring(2) // strip './' from the beginning of path
    const output = value.substring(2) // strip './' from the beginning of path

    Object.keys(BUILD_VARIANTS).forEach((item) => {
      if (PKG[item] === source && source !== output) {
        result.push({
          ...BUILD_VARIANTS[item],
          file: output,
          platform: 'browser',
        })
      }
    })
  })

  return result
}

/** Drop repeated (file, format, platform, env) variants (paths compared normalised, so
 *  `./lib/a.js` equals `lib/a.js`) — e.g. `exports.import`
 *  and `module` pointing at the same file — keeping the first (which carries
 *  the explicit `input` when it comes from `exports`). */
const dedupeVariants = (variants: Record<string, any>[]) => {
  const seen = new Set<string>()
  return variants.filter((v) => {
    const key = `${posix.normalize(v.file)}|${v.format}|${v.platform}|${v.env}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const createBuildPipeline = () => {
  if (Array.isArray(CONFIG.entries) && CONFIG.entries.length > 0) {
    return CONFIG.entries.map((entry: Record<string, string | undefined>) => ({
      format: entry.format || 'es',
      env: entry.env || 'development',
      platform: entry.platform || 'universal',
      file: entry.file,
      input: entry.input,
    }))
  }

  return dedupeVariants([
    ...createBasicBuildVariants(),
    ...createBrowserBuildVariants(),
  ])
}

export default createBuildPipeline
