const { PKG } = require('../utils')

const shouldBuildNative = PKG['react-native'] !== PKG.module

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
    platform: undefined,
  },
  module: {
    format: 'es',
    env: 'development',
    platform: undefined,
  },
  'react-native': {
    format: 'es',
    env: 'development',
    platform: 'native',
  },
  'umd:main': { format: 'umd', env: 'development' },
  unpkg: { format: 'umd', env: 'production' },
}

const createBasicBuildVariants = () => {
  const result = []

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
        // if has a different browser build, set default platform to server
        // as there is going to be created a separate browser build as well
        add({ platform: 'server' })
      } else {
        add()
      }
    }
  })

  return result
}

const createBrowserBuildVariants = () => {
  if (!PKG.browser) return false

  const result = []

  Object.entries(PKG.browser).forEach(([key, value]) => {
    const source = key.substring(2) // strip './' from the beginning of path
    const output = value.substring(2) // strip './' from the beginning of path

    Object.keys(BASE_VARIANTS).forEach((item) => {
      if (PKG[item] === source) {
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
  result[0] = { ...result[0], typings: true }

  return result
}

module.exports = createBuildPipeline
