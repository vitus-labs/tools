const typescript = require('rollup-plugin-typescript2')
const resolve = require('@rollup/plugin-node-resolve').default
const filesize = require('rollup-plugin-filesize')
const visualizer = require('rollup-plugin-visualizer')
const replace = require('@rollup/plugin-replace')
const { terser } = require('rollup-plugin-terser')
const babel = require('rollup-plugin-babel')
const { PKG, loadConfig, swapGlobals } = require('./utils')
const baseConfig = require('./baseConfig')

const CONFIG = loadConfig(baseConfig)

const loadPlugins = ({ env, platform, typings, file }) => {
  const babelConfig = {
    extensions: CONFIG.extensions,
    include: [CONFIG.sourceDir],
    exclude: CONFIG.exclude,
  }

  const tsConfig = {
    exclude: CONFIG.exclude,
    useTsconfigDeclarationDir: true,
    tsconfigDefaults: {
      compilerOptions: {
        declaration: typings,
        declarationDir: 'lib/types',
      },
    },
  }

  const replaceOptions = {
    'process.env.NODE_ENV': JSON.stringify(env),
    __VERSION__: JSON.stringify(PKG.version),
    __SERVER__: JSON.stringify(
      platform ? platform === 'server' : 'typeof window === undefined'
    ),
    __BROWSER__: JSON.stringify(
      platform ? platform === 'web' : 'typeof window !== undefined'
    ),
    __NATIVE__: JSON.stringify(
      platform ? platform === 'native' : 'typeof window !== undefined'
    ),
    __CLIENT__: JSON.stringify(
      platform
        ? ['native', 'web'].includes(platform)
        : 'typeof window !== undefined'
    ),
  }

  const plugins = [resolve({ extensions: CONFIG.extensions })]

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
      filename: `${filePath.join('/')}/analysis/${fileName}.html`,
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
