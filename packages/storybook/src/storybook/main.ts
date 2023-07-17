import path from 'path'
import { DefinePlugin } from 'webpack'
import babelConfig from './babel'
import { CONFIG, TS_CONFIG } from '../config/index.js'

const aliases = TS_CONFIG.get('compilerOptions.paths', {})
const baseUrl = TS_CONFIG.get('compilerOptions.baseUrl', '')

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
  features: {
    storyStoreV7: true,
    babelModeV7: true,
    postcss: false,
  },
  stories: CONFIG.storiesDir,
  addons: Object.entries(CONFIG.addons).reduce((acc, [key, value]) => {
    const addon = ADDONS_MAP[key]
    if (addon && value && value !== null) {
      acc.push(addon)
    }

    return acc
  }, [] as any),

  babel: async () => ({
    ...babelConfig,
  }),
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
        data.test =
          /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani)(\?.*)?$/
      return data
    })

    config.module.rules.push({
      test: /\.svg$/,
      use: [{ loader: 'svg-inline-loader' }],
    })

    // define global variables
    config.plugins.push(
      new DefinePlugin({
        __BROWSER__: JSON.stringify(true),
        __NATIVE__: JSON.stringify(false),
        __NODE__: JSON.stringify(true),
        __WEB__: JSON.stringify(true),
        __CLIENT__: JSON.stringify(true),
        __VITUS_LABS_STORIES__: JSON.stringify(CONFIG),
      })
    )

    return config
  },
}
