import { CONFIG, PKG } from '../config/index.js'

const isESModuleOnly = PKG.type === 'module'

const hasDifferentNativeBuild = () => {
  return PKG['react-native'] !== PKG.module
}

const hasDifferentBrowserBuild = (type: string) => {
  if (!PKG.browser) return false

  return Object.entries(PKG.browser as Record<string, string>).some(
    ([key, value]) => {
      const source = key.substring(2)
      const output = value.substring(2)

      return source !== PKG[type] && source !== output
    },
  )
}

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
 *  "." → "src/index.ts", "./devtools" → "src/devtools/index.ts",
 *  "./validation/zod" → "src/validation/zod.ts" (file) or "src/validation/zod/index.ts" (dir) */
const resolveSubpathInput = (exportPath: string): string => {
  if (exportPath === '.') return `${CONFIG.sourceDir}/index.ts`
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

  if (conditions.import) {
    result.push({ file: conditions.import, ...BUILD_VARIANTS.module, ...base })
  }
  if (conditions.require) {
    result.push({
      file: conditions.require,
      format: 'cjs',
      env: 'development',
      platform: 'universal',
      ...base,
    })
  }
  if (conditions.node) {
    result.push({
      file: conditions.node,
      ...BUILD_VARIANTS.module,
      platform: 'node',
      ...base,
    })
  }
  if (conditions.default && !conditions.import) {
    result.push({ file: conditions.default, ...BUILD_VARIANTS.module, ...base })
  }

  return result
}

/** Parse subpath exports object into build variants */
const parseSubpathExports = (
  exportsOptions: Record<string, any>,
): Record<string, any>[] => {
  const result: Record<string, any>[] = []

  for (const [exportPath, exportConfig] of Object.entries(exportsOptions)) {
    if (typeof exportConfig === 'string') {
      result.push({
        file: exportConfig,
        input: resolveSubpathInput(exportPath),
        ...BUILD_VARIANTS.module,
      })
    } else if (typeof exportConfig === 'object') {
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
  if (!PKG.browser) return result

  Object.entries(PKG.browser as Record<string, string>).forEach(
    ([key, value]) => {
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
    },
  )

  return result
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

  return [...createBasicBuildVariants(), ...createBrowserBuildVariants()]
}

export default createBuildPipeline
