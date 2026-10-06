import { PKG } from '../config/index.ts'

const isESModuleOnly = PKG.type === 'module'

/**
 * Conditions of the package root entry. `exports` may be a string, a
 * conditions object (`{ import, require }`) or a subpath map whose root
 * entry is `exports["."]` — the latter being the most common shape.
 */
const getRootExports = (): string | Record<string, unknown> | undefined => {
  const exportsField = PKG.exports
  if (!exportsField || typeof exportsField !== 'object') return exportsField
  const isSubpathMap = Object.keys(exportsField).some((key) =>
    key.startsWith('.'),
  )
  return isSubpathMap ? exportsField['.'] : exportsField
}

/** Resolve a condition value; nested conditions (`{ types, default }`) collapse to `default`. */
const resolveCondition = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    return resolveCondition((value as Record<string, unknown>).default)
  }
  return undefined
}

/** `types` of the root entry, also when nested under `import`/`require`. */
const getExportsTypes = (): string | undefined => {
  const root = getRootExports()
  if (!root || typeof root !== 'object') return undefined
  if (typeof root.types === 'string') return root.types
  for (const condition of ['import', 'require', 'default']) {
    const nested = root[condition]
    if (nested && typeof nested === 'object') {
      const types = (nested as Record<string, unknown>).types
      if (typeof types === 'string') return types
    }
  }
  return undefined
}

const typesFilePath = getExportsTypes() || PKG.types || PKG.typings

const hasDifferentNativeBuild = () => {
  return PKG['react-native'] !== PKG.module
}

// only the object form of `browser` maps files; string form and `false`
// values (e.g. { "fs": false }) carry no build information.
const getBrowserEntries = (): [string, string][] => {
  const browser = PKG.browser
  if (!browser || typeof browser !== 'object') return []

  return Object.entries(browser as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[0].startsWith('./'),
  )
}

const hasDifferentBrowserBuild = (type: string) => {
  return getBrowserEntries().some(([key, value]) => {
    const source = key.substring(2)
    const output = value.substring(2)

    return source !== PKG[type] && source !== output
  })
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

const getExportsOptions = () => {
  const root = getRootExports()

  if (!root) return []

  if (typeof root === 'string') {
    return [
      {
        file: root,
        ...BUILD_VARIANTS.module,
      },
    ]
  }

  if (typeof root === 'object') {
    const result: Record<string, any>[] = []
    const importFile = resolveCondition(root.import)
    const requireFile = resolveCondition(root.require)
    const nodeFile = resolveCondition(root.node)
    const defaultFile = resolveCondition(root.default)

    if (importFile) {
      result.push({
        file: importFile,
        ...BUILD_VARIANTS.module,
      })
    }

    if (requireFile) {
      result.push({
        file: requireFile,
        ...BUILD_VARIANTS.main,
        // the `require` entry must always be CommonJS, even in ESM-only packages
        format: 'cjs',
      })
    }

    if (nodeFile) {
      result.push({
        file: nodeFile,
        ...BUILD_VARIANTS.module,
        platform: 'node',
      })
    }

    if (defaultFile) {
      result.push({
        file: defaultFile,
        ...BUILD_VARIANTS.module,
      })
    }

    return result
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

  getBrowserEntries().forEach(([key, value]) => {
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

const createBuildPipeline = () => {
  // drop variants that would write the same file in the same format twice
  const seen = new Set<string>()
  const result = [
    ...createBasicBuildVariants(),
    ...createBrowserBuildVariants(),
  ].filter((item) => {
    const key = `${item.file}::${item.format}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // add generate typings for the first bundle only
  if (typesFilePath) {
    if (result.length > 0) {
      result[0] = { ...result[0], typesFilePath }
    } else {
      console.warn(
        '[vl_build] "types" is set but no build variants were found; skipping typings generation.',
      )
    }
  }

  return result
}

export default createBuildPipeline
