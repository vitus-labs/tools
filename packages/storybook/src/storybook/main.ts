import path from 'node:path'
import { DefinePlugin } from 'webpack'
import { get } from 'lodash-es'
import type { StorybookConfig } from '@storybook/react-webpack5'

// import babelConfig from './babel.js'
import { CONFIG, TS_CONFIG } from '../config/index.js'

const aliases = get(TS_CONFIG, 'compilerOptions.paths', {})
const baseUrl = get(TS_CONFIG, 'compilerOptions.baseUrl', '')

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

const STORYBOOK_CONFIG: StorybookConfig = {
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  stories: [{ directory: CONFIG.storiesDir }],
  addons: Object.entries(CONFIG.addons).reduce((acc, [key, value]) => {
    const addon = ADDONS_MAP[key]
    if (addon && value && value !== null) {
      acc.push(addon)
    }

    return acc
  }, [] as any),
  // babel: async () => ({
  //   ...babelConfig,
  // }),
  webpackFinal: async (config) => {
    const aliases = { ...config.resolve?.alias, ...getTSConfigAliases() }

    // add aliases from tsConfig file
    if (config.resolve) {
      config.resolve.alias = aliases
    }

    // add fonts
    config.module?.rules?.push({
      test: /\.(png|woff|woff2|eot|ttf|svg)$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name() {
              return '[name].[ext]'
            },
          },
        },
      ],
      include: path.resolve(process.cwd()),
    })

    // add loading svg icons
    // https://www.gitmemory.com/issue/storybookjs/storybook/5708/515384927
    // if (config.module) {
    //   config.module.rules = config.module.rules?.map((data) => {
    //     if (/svg\|/.test(String(data?.test)))
    //       data.test =
    //         /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani)(\?.*)?$/
    //     return data
    //   })
    // }

    config.module?.rules?.push({
      test: /\.svg$/,
      use: [{ loader: 'svg-inline-loader' }],
    })

    // define global variables
    config.plugins?.push(
      // @ts-ignore
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

export default STORYBOOK_CONFIG
