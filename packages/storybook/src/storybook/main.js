/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-param-reassign */
const path = require('path')
const get = require('lodash.get')
const { DefinePlugin } = require('webpack')
const CONFIG = require('../config')
const { loadFile } = require('../utils')

const tsConfig = loadFile('tsconfig.json')
const aliases = get(tsConfig, 'compilerOptions.paths', {})
const baseUrl = get(tsConfig, 'compilerOptions.baseUrl', '')

console.log(tsConfig)

// --------------------------------------------------------
// TS CONFIG parsing
// --------------------------------------------------------
const normalizeString = (value) => {
  if (value.endsWith('/*')) return value.slice(0, -2)
  return value
}

const getTSConfigAliases = () => {
  const result = {}

  Object.entries(aliases).forEach(([key, value]) => {
    const alias = normalizeString(key)
    let dir

    if (typeof value === 'string') dir = normalizeString(value)
    else if (Array.isArray(value)) {
      dir = normalizeString(value[0])
    }

    result[alias] = path.resolve(process.cwd(), baseUrl, dir)
  })
  return result
}

// --------------------------------------------------------
// STORYBOOK configuration
// --------------------------------------------------------
module.exports = {
  stories: CONFIG.stories,
  addons: Object.keys(CONFIG.addons).map((item) => `@storybook/addon-${item}`),

  webpackFinal: async (config) => {
    const aliases = { ...config.resolve.alias, ...getTSConfigAliases() }

    console.log(aliases)

    // add aliases from tsConfig file
    config.resolve.alias = aliases

    // add fonts
    config.module.rules.push({
      test: /\.(png|woff|woff2|eot|ttf|svg)$/,
      use: [
        {
          loader: 'file-loader',
          query: {
            name: '[name].[ext]',
          },
        },
      ],
      include: path.resolve(process.cwd()),
    })

    // add loading svg icons
    // https://www.gitmemory.com/issue/storybookjs/storybook/5708/515384927
    // eslint-disable-next-line no-param-reassign
    config.module.rules = config.module.rules.map((data) => {
      if (/svg\|/.test(String(data.test)))
        // eslint-disable-next-line no-param-reassign
        data.test = /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani)(\?.*)?$/
      return data
    })

    config.module.rules.push({
      test: /\.svg$/,
      use: [{ loader: 'svg-inline-loader' }],
    })

    // define global variables
    config.plugins.push(
      new DefinePlugin({
        __BROWSER__: true,
        __NATIVE__: false,
        __SERVER__: true,
        __WEB__: true,
        __CLIENT__: true,
        __VITUS_LABS_STORIES__: JSON.stringify(CONFIG),
      })
    )

    return config
  },
}
