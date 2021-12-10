/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-param-reassign */
import path from 'path'
import get from 'lodash.get'
import { DefinePlugin } from 'webpack'
import CONFIG from '../config'
import { internalConfig } from '../config/root'
import { loadFile } from '../utils'

const tsConfig = loadFile('tsconfig.json')
const aliases = get(tsConfig, 'compilerOptions.paths', {})
const baseUrl = get(tsConfig, 'compilerOptions.baseUrl', '')

const ADDONS_MAP = {
  a11y: '@storybook/addon-a11y',
  actions: '@storybook/addon-actions',
  backgrounds: '@storybook/addon-backgrounds',
  controls: '@storybook/addon-controls',
  docs: '@storybook/addon-docs',
  mode: 'storybook-dark-mode',
  toolbars: '@storybook/addon-toolbars',
  viewport: '@storybook/addon-viewport',
  measure: '@storybook/addon-measure',
  outline: 'storybook-addon-outline',
}

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

export default {
  stories: CONFIG.storiesDir,
  addons: Object.entries(CONFIG.addons).reduce((acc, [key, value]) => {
    const addon = ADDONS_MAP[key]
    if (addon && value && value !== null) {
      acc.push(addon)
    }

    return acc
  }, [] as any),

  webpackFinal: async (config) => {
    const aliases = { ...config.resolve.alias, ...getTSConfigAliases() }

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
        __VL_TEST__: DefinePlugin.runtimeValue(() => {
          return JSON.stringify(internalConfig.config)
        }),
      })
    )

    return config
  },
}
