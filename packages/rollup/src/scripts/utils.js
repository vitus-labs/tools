const { PKG } = require('../utils')

const shouldBuildNative = PKG['react-native'] !== PKG.module
const shouldGenerateTypes = !!(PKG.types || PKG.typings)

const hasDifferentBrowserBuild = (type) => {
  if (!PKG.browser) return false

  return Object.entries(PKG.browser).some(([key, value]) => {
    const source = key.substring(2)
    const output = value.substring(2)

    return source !== PKG[type] && source !== output
  })
}

const BASE_VARIANTS = {
  main: {
    format: 'cjs',
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
  const exportsOptions = PKG['exports']

  if (!exportsOptions) return []

  if (typeof exportsOptions === 'string') {
    return [
      {
        file: PKG['exports'],
        ...BASE_VARIANTS['module'],
      },
    ]
  }

  if (typeof exportsOptions === 'object') {
    const result = []

    if (exportsOptions.import) {
      result.push({
        file: exportsOptions.import,
        ...BASE_VARIANTS['module'],
      })
    }

    if (exportsOptions.require) {
      result.push({
        file: exportsOptions.require,
        ...BASE_VARIANTS['main'],
      })
    }

    if (exportsOptions.node) {
      result.push({
        file: exportsOptions.node,
        ...BASE_VARIANTS['module'],
        platform: 'node',
      })
    }

    if (exportsOptions.default) {
      result.push({
        file: exportsOptions.default,
        ...BASE_VARIANTS['module'],
      })
    }

    return result
  }

  return []
}

const createBasicBuildVariants = () => {
  const isModule = PKG['type'] === 'module'
  let result = []

  if (isModule) result = [...getExportsOptions()]

  Object.keys(BASE_VARIANTS).forEach((key) => {
    const PKGOutDir = PKG[key]

    if (PKGOutDir) {
      const hasBrowserBuild = hasDifferentBrowserBuild(key)

      // create a helper function for adding a build variant to an array
      const add = (props = {}) => {
        result.push({ ...BASE_VARIANTS[key], file: PKGOutDir, ...props })
      }

      if (key === 'react-native') {
        // add a separate RN build only if output path differs from module path
        if (shouldBuildNative) {
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
  const result = []
  if (!PKG.browser) return result

  Object.entries(PKG.browser).forEach(([key, value]) => {
    const source = key.substring(2) // strip './' from the beginning of path
    const output = value.substring(2) // strip './' from the beginning of path

    Object.keys(BASE_VARIANTS).forEach((item) => {
      if (PKG[item] === source && source !== output) {
        result.push({
          ...BASE_VARIANTS[item],
          file: output,
          platform: 'browser',
        })
      }
    })
  })

  return result
}

const createBuildPipeline = () => {
  const result = [
    ...createBasicBuildVariants(),
    ...createBrowserBuildVariants(),
  ]

  // add generate typings for the first bundle only
  result[0] = { ...result[0], typings: shouldGenerateTypes }

  return result
}

module.exports = createBuildPipeline
