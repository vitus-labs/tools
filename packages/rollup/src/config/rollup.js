const typescript = require('rollup-plugin-typescript2')
const ttypescript = require('ttypescript')
const resolve = require('@rollup/plugin-node-resolve').default
const filesize = require('rollup-plugin-filesize')
const visualizer = require('rollup-plugin-visualizer')
const replace = require('@rollup/plugin-replace')
const { terser } = require('rollup-plugin-terser')
const babel = require('rollup-plugin-babel')
const baseConfig = require('./baseConfig')
const { PKG, loadConfig, swapGlobals } = require('../utils')

const CONFIG = loadConfig(baseConfig)

const defineExtensions = (platform) => {
  const platformExtensions = []

  if (['browser', 'server', 'web', 'native'].includes(platform)) {
    CONFIG.extensions.forEach((item) => {
      platformExtensions.push(`.${platform}${item}`)
    })
  }

  return platformExtensions.concat(CONFIG.extensions)
}

const loadPlugins = ({ env, platform, typings, file }) => {
  const extensions = defineExtensions(platform)

  const babelConfig = {
    extensions,
    include: [CONFIG.sourceDir],
    exclude: CONFIG.exclude,
  }

  const tsConfig = {
    typescript: ttypescript,
    exclude: CONFIG.exclude,
    useTsconfigDeclarationDir: true,
    tsconfigDefaults: {
      exclude: CONFIG.exclude,
      include: CONFIG.include,
      compilerOptions: {
        types: ['@vitus-labs/tools-rollup'],
        declaration: typings,
        declarationDir: CONFIG.typesDir,
        plugins: [
          {
            transform: '@zerollup/ts-transform-paths',
            exclude: ['*'],
          },
        ],
      },
    },
  }

  const replaceOptions = {
    __VERSION__: JSON.stringify(PKG.version),
    __SERVER__: JSON.stringify(platform === 'server'),
    __WEB__: JSON.stringify(['server', 'browser'].includes(platform)),
    __BROWSER__: JSON.stringify(platform === 'browser'),
    __NATIVE__: JSON.stringify(platform === 'native'),
    __CLIENT__: JSON.stringify(['native', 'browser'].includes(platform)),
  }

  if (env === 'production') {
    replaceOptions['process.env.NODE_ENV'] = JSON.stringify(env)
  }

  const plugins = [resolve({ extensions })]

  if (CONFIG.typescript) {
    plugins.push(typescript(tsConfig))
  }

  plugins.push(replace(replaceOptions))
  plugins.push(babel(babelConfig))

  // generate visualised graphs in dist folder
  if (CONFIG.visualise) {
    const filePath = file.split('/')
    const fileName = filePath.pop()

    const visualiserOptions = {
      title: `${PKG.name} - ${fileName}`,
      filename: `${filePath.join('/')}/${
        CONFIG.visualise.outputDir
      }/${fileName}.html`,
      template: CONFIG.visualise.template,
      gzipSize: CONFIG.visualise.gzipSize,
    }

    plugins.push(visualizer(visualiserOptions))
  }

  if (env === 'production') {
    plugins.push(terser())
  }

  if (CONFIG.filesize) {
    plugins.push(filesize())
  }

  return plugins
}

const rollupConfig = ({ file, format, env, typings, platform }) => {
  const plugins = loadPlugins({ file, env, typings, platform })

  return {
    input: CONFIG.sourceDir,
    output: {
      file,
      format,
      globals: swapGlobals(CONFIG.globals),
      sourcemap: true,
      exports: format === 'cjs' ? 'named' : undefined,
      name: ['umd', 'iife'].includes(format) ? PKG.bundleName : undefined,
    },
    external: PKG.externalDependencies,
    plugins,
  }
}

module.exports = rollupConfig
