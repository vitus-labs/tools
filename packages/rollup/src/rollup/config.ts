import { createRequire } from 'node:module'
import { posix } from 'node:path'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { expandExternal, filesize, swapGlobals } from '@vitus-labs/tools-core'
import chalk from 'chalk'
import { apiExtractor } from 'rollup-plugin-api-extractor'
import { visualizer } from 'rollup-plugin-visualizer'
import { CONFIG, PKG, PLATFORMS } from '../config/index.ts'

const require = createRequire(import.meta.url)

// Heavy CJS plugins are loaded lazily, only when the config shape needs them.
const loadTypescriptPlugin =
  (): typeof import('rollup-plugin-typescript2').default =>
    require('rollup-plugin-typescript2')
const loadReplacePlugin = (): typeof import('@rollup/plugin-replace').default =>
  require('@rollup/plugin-replace')
const loadTerserPlugin = (): typeof import('@rollup/plugin-terser').default =>
  require('@rollup/plugin-terser')

const defineExtensions = (platform: string) => {
  const platformExtensions: string[] = []

  if ((PLATFORMS as readonly string[]).includes(platform)) {
    CONFIG.extensions.forEach((item: string) => {
      platformExtensions.push(`.${platform}${item}`)
    })
  }

  return platformExtensions.concat(CONFIG.extensions)
}

const loadPlugins = ({
  env,
  platform,
  file,
  typesFilePath,
}: {
  env: string
  platform: string
  file: string
  typesFilePath?: string
}) => {
  const extensions = defineExtensions(platform)
  const plugins = [nodeResolve({ extensions, browser: platform === 'browser' })]

  if (CONFIG.typescript) {
    const tsConfig: Record<string, any> = {
      typescript: require('ts-patch/compiler'),
      exclude: CONFIG.exclude,
      useTsconfigDeclarationDir: true,
      clean: true,
      tsconfigDefaults: {
        exclude: CONFIG.exclude,
        include: CONFIG.include,
        declarationMap: false,
        declaration: false,
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

    if (typesFilePath) {
      tsConfig.tsconfigDefaults.compilerOptions.declarationMap = true
      tsConfig.tsconfigDefaults.compilerOptions.declaration = true
      tsConfig.tsconfigDefaults.compilerOptions.declarationDir = CONFIG.typesDir
    }

    plugins.push(loadTypescriptPlugin()(tsConfig))

    if (typesFilePath) {
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
              untrimmedFilePath: `<projectFolder>/${typesFilePath.replace(/^\.?\//, '')}`,
            },
          },
        }),
      )
    }
  }

  if (CONFIG.replaceGlobals) {
    const replaceOptions: Record<string, string> = {
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

    plugins.push(
      loadReplacePlugin()({ preventAssignment: true, values: replaceOptions }),
    )
  }

  // generate visualised graphs in dist folder

  if (CONFIG.visualise) {
    const fileName = posix.basename(file)

    const visualiserOptions = {
      title: `${PKG.name} - ${fileName}`,
      filename: posix.join(
        posix.dirname(file),
        CONFIG.visualise.outputDir,
        `${fileName}.html`,
      ),
      template: CONFIG.visualise.template,
      gzipSize: CONFIG.visualise.gzipSize,
    }

    plugins.push(visualizer(visualiserOptions))
  }

  if (env === 'production') {
    plugins.push(loadTerserPlugin()())
  }

  if (CONFIG.filesize) {
    plugins.push(filesize({ name: chalk.bold, value: chalk.dim }))
  }

  return plugins
}

const rollupConfig = ({
  file,
  format,
  env,
  typesFilePath,
  platform,
}: Record<string, any>) => {
  const plugins = loadPlugins({ file, env, typesFilePath, platform })

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
    external: [...PKG.externalDependencies, ...CONFIG.external].map(
      expandExternal,
    ),
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
    },
    plugins,
  }

  return buildOutput
}

export default rollupConfig
