import { PKG } from '../config/index.ts'

const isESModuleOnly = PKG.type === 'module'
const typesFilePath = PKG?.exports?.types || PKG.types || PKG.typings

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
  const exportsOptions = PKG.exports

  if (!exportsOptions) return []

  if (typeof exportsOptions === 'string') {
    return [
      {
        file: PKG.exports,
        ...BUILD_VARIANTS.module,
      },
    ]
  }

  if (typeof exportsOptions === 'object') {
    const result: Record<string, any>[] = []

    if (exportsOptions.import) {
      result.push({
        file: exportsOptions.import,
        ...BUILD_VARIANTS.module,
      })
    }

    if (exportsOptions.require) {
      result.push({
        file: exportsOptions.require,
        ...BUILD_VARIANTS.main,
        // the `require` entry must always be CommonJS, even in ESM-only packages
        format: 'cjs',
      })
    }

    if (exportsOptions.node) {
      result.push({
        file: exportsOptions.node,
        ...BUILD_VARIANTS.module,
        platform: 'node',
      })
    }

    if (exportsOptions.default) {
      result.push({
        file: exportsOptions.default,
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
