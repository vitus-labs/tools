#!/usr/bin/env node
const rollup = require('rollup')
const rollupConfig = require('../src/rollup')
const { PKG } = require('../src/utils')

// --------------------------------------------------------
// GET BUILD TYPES from package.json
// --------------------------------------------------------
const getBuildTypes = () => {
  const browserBuilds = PKG.browser

  const hasDifferentBrowserBuilds = () => {
    if (!browserBuilds) return false

    return Object.entries(browserBuilds).some(([key, value]) => {
      const source = key.substring(2)
      const output = value.substring(2)

      return source !== output
    })
  }

  const shouldBuildBrowser = hasDifferentBrowserBuilds()
  const shouldBuildNative = PKG['react-native'] !== PKG.module

  const browserOptions = {
    main: {
      format: 'cjs',
      env: 'development',
      platform: browserBuilds ? 'browser' : undefined,
    },
    module: {
      format: 'es',
      env: 'development',
      platform: browserBuilds ? 'browser' : undefined,
    },
  }

  const options = {
    main: {
      format: 'cjs',
      env: 'development',
      platform: shouldBuildBrowser ? undefined : 'server',
    },
    module: {
      format: 'es',
      env: 'development',
      platform: shouldBuildBrowser ? undefined : 'server',
    },
    'react-native': {
      format: 'es',
      env: 'development',
      platform: shouldBuildNative ? 'native' : undefined,
    },
    'umd:main': { format: 'umd', env: 'development' },
    unpkg: { format: 'umd', env: 'production' },
  }

  const result = []
  Object.keys(options).forEach((item) => {
    if (PKG[item]) {
      const add = () => {
        result.push({ ...options[item], file: PKG[item] })
      }

      if (item === 'react-native') {
        if (shouldBuildNative) {
          add()
        }
      } else {
        add()
      }
    }
  })

  // set browser build options
  if (shouldBuildBrowser) {
    Object.entries(browserBuilds).forEach(([key, value]) => {
      const source = key.substring(2)
      const output = value.substring(2)

      Object.entries(PKG).forEach(([k, v]) => {
        if (source === v && ['main', 'module'].includes(k)) {
          result.push({ ...browserOptions[k], file: output })
        }
      })
    })
  }

  // add generate typings for the first bundle only
  result[0] = { ...result[0], typings: true }

  return result
}

// --------------------------------------------------------
// BUILD rollup
// --------------------------------------------------------
async function build({ inputOptions, outputOptions }) {
  const bundle = await rollup.rollup(inputOptions)

  await bundle.write(outputOptions)
}

// --------------------------------------------------------
// SERIALIZE ALL BUILDS
// --------------------------------------------------------
const createBuilds = () => {
  let p = Promise.resolve() // Q() in q

  // serialize builds
  getBuildTypes().forEach((item) => {
    const { output, ...input } = rollupConfig(item)

    p = p.then(() => build({ inputOptions: input, outputOptions: output }))
  })

  return p
}

createBuilds()
