const typescript = require('rollup-plugin-typescript2')
const ttypescript = require('ttypescript')
const pathsTransformer = require('ts-transform-paths').default
const { apiExtractor } = require('rollup-plugin-api-extractor')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const filesize = require('rollup-plugin-filesize')
const { visualizer } = require('rollup-plugin-visualizer')
const replace = require('@rollup/plugin-replace')
const { terser } = require('@rollup/plugin-terser')
const babel = require('@rollup/plugin-babel')
const baseConfig = require('./baseConfig')
const { PKG, loadConfig, swapGlobals } = require('../utils')

const CONFIG = loadConfig(baseConfig)

const defineExtensions = (platform) => {
  const platformExtensions = []

  if (['browser', 'node', 'web', 'native'].includes(platform)) {
    CONFIG.extensions.forEach((item) => {
      platformExtensions.push(`.${platform}${item}`)
    })
  }

  return platformExtensions.concat(CONFIG.extensions)
}

const loadPlugins = ({ env, platform, types, file }) => {
  const extensions = defineExtensions(platform)

  const babelConfig = {
    extensions,
    include: [CONFIG.sourceDir],
    exclude: CONFIG.exclude,
    babelHelpers: 'runtime',
  }

  const tsConfig = {
    typescript: ttypescript,
    transformers: [(service) => pathsTransformer(service)],
    exclude: CONFIG.exclude,
    useTsconfigDeclarationDir: true,
    clean: true,
    tsconfigDefaults: {
      exclude: CONFIG.exclude,
      include: CONFIG.include,
      compilerOptions: {
        types: ['@vitus-labs/tools-rollup'],
      },
    },
  }

  if (types) {
    tsConfig.tsconfigDefaults.compilerOptions.declarationMap = types
    tsConfig.tsconfigDefaults.compilerOptions.declaration = types
    tsConfig.tsconfigDefaults.compilerOptions.declarationDir = CONFIG.typesDir
  }

  const plugins = [nodeResolve({ extensions, browser: platform === 'browser' })]

  if (CONFIG.typescript) {
    plugins.push(typescript(tsConfig))

    if (types) {
      plugins.push(
        apiExtractor({
          cleanUpRollup: true,
          configuration: {
            mainEntryPointFilePath: `${CONFIG.typesDir}/index.d.ts`,
            projectFolder: process.cwd(),
            compiler: {
              tsconfigFilePath: '<projectFolder>/tsconfig.json',
            },
            dtsRollup: {
              enabled: true,
              untrimmedFilePath: `<projectFolder>${PKG.typings || PKG.types}`,
            },
          },
        })
      )
    }
  }

  if (CONFIG.replaceGlobals) {
    const replaceOptions = {
      __VERSION__: JSON.stringify(PKG.version),
      __NODE__: JSON.stringify(platform === 'node'),
      __WEB__: JSON.stringify(
        ['node', 'browser', 'universal'].includes(platform)
      ),
      __BROWSER__: JSON.stringify(platform === 'browser'),
      __NATIVE__: JSON.stringify(platform === 'native'),
      __CLIENT__: JSON.stringify(['native', 'browser'].includes(platform)),
    }

    if (env === 'production') {
      replaceOptions['process.env.NODE_ENV'] = JSON.stringify(env)
    }

    plugins.push(replace({ preventAssignment: true, values: replaceOptions }))
  }

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

const rollupConfig = ({ file, format, env, types, platform }) => {
  const plugins = loadPlugins({ file, env, types, platform })

  const buildOutput = {
    input: CONFIG.sourceDir,
    output: {
      file,
      format,
      globals: swapGlobals(CONFIG.globals),
      sourcemap: true,
      exports: ['cjs', 'umd'].includes(format) ? 'named' : undefined,
      name: ['umd', 'iife'].includes(format) ? PKG.bundleName : undefined,
    },
    external: PKG.externalDependencies,
    plugins,
  }

  return buildOutput
}

module.exports = rollupConfig
