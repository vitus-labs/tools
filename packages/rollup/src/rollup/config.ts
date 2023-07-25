import { createRequire } from 'node:module'
import typescript from 'rollup-plugin-typescript2'
import { apiExtractor } from 'rollup-plugin-api-extractor'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import filesize from 'rollup-plugin-filesize'
import { visualizer } from 'rollup-plugin-visualizer'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import { swapGlobals } from '@vitus-labs/tools-core'
import { CONFIG, PKG, PLATFORMS } from '../config/index.js'

const require = createRequire(import.meta.url)
const tspCompiler = require('ts-patch/compiler')

const defineExtensions = (platform) => {
  const platformExtensions: string[] = []

  if (PLATFORMS.includes(platform)) {
    CONFIG.extensions.forEach((item) => {
      platformExtensions.push(`.${platform}${item}`)
    })
  }

  return platformExtensions.concat(CONFIG.extensions)
}

const loadPlugins = ({ env, platform, types, file }) => {
  const extensions = defineExtensions(platform)
  const plugins = [nodeResolve({ extensions, browser: platform === 'browser' })]

  if (CONFIG.typescript) {
    const tsConfig: Record<string, any> = {
      typescript: tspCompiler,
      exclude: CONFIG.exclude,
      useTsconfigDeclarationDir: true,
      clean: true,
      tsconfigDefaults: {
        exclude: CONFIG.exclude,
        include: CONFIG.include,
        compilerOptions: {
          types: ['@vitus-labs/tools-rollup'],
          plugins: [
            { transform: 'typescript-transform-paths' },
            {
              transform: 'typescript-transform-paths',
              afterDeclarations: true,
            },
          ],
        },
      },
    }

    if (types) {
      tsConfig.tsconfigDefaults.compilerOptions.declarationMap = types
      tsConfig.tsconfigDefaults.compilerOptions.declaration = types
      tsConfig.tsconfigDefaults.compilerOptions.declarationDir = CONFIG.typesDir
    }

    plugins.push(typescript(tsConfig))

    if (types) {
      plugins.push(
        apiExtractor({
          cleanUpRollup: true,
          configuration: {
            mainEntryPointFilePath: `<projectFolder>/${CONFIG.typesDir}/index.d.ts`,
            projectFolder: process.cwd(),
            compiler: {
              tsconfigFilePath: '<projectFolder>/tsconfig.json',
              skipLibCheck: true,
            },
            dtsRollup: {
              enabled: true,
              untrimmedFilePath: `<projectFolder>${PKG.typings || PKG.types}`,
            },
          },
        }),
      )
    }
  }

  if (CONFIG.replaceGlobals) {
    const replaceOptions = {
      __VERSION__: JSON.stringify(PKG.version),
      __NODE__: JSON.stringify(platform === 'node'),
      __WEB__: JSON.stringify(
        ['node', 'browser', 'universal'].includes(platform),
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

const rollupConfig = ({
  file,
  format,
  env,
  types,
  platform,
}: Record<string, any>) => {
  const plugins = loadPlugins({ file, env, types, platform })

  const buildOutput = {
    makeAbsoluteExternalsRelative: true,
    preserveEntrySignatures: 'strict',
    input: CONFIG.sourceDir,
    output: {
      file,
      format,
      globals: swapGlobals(CONFIG.globals),
      sourcemap: true,
      exports: ['cjs', 'umd'].includes(format) ? 'named' : undefined,
      name: ['umd', 'iife'].includes(format) ? PKG.bundleName : undefined,
      esModule: true,
      generatedCode: {
        reservedNamesAsProps: false,
      },
      interop: 'compat',
      systemNullSetters: false,
    },
    external: PKG.externalDependencies,
    plugins,
  }

  return buildOutput
}

export default rollupConfig
