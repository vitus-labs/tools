import { PKG } from '../config/index.js'

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
  return [...createBasicBuildVariants(), ...createBrowserBuildVariants()]
}

export default createBuildPipeline
