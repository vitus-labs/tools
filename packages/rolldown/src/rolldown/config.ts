import { swapGlobals } from '@vitus-labs/tools-core'
import type { RolldownPlugin } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import filesize from 'rollup-plugin-filesize'
import { visualizer } from 'rollup-plugin-visualizer'
import { CONFIG, PKG, PLATFORMS } from '../config/index.js'

const defineExtensions = (platform: string) => {
  const platformExtensions: string[] = []

  if ((PLATFORMS as readonly string[]).includes(platform)) {
    CONFIG.extensions.forEach((item: string) => {
      platformExtensions.push(`.${platform}${item}`)
    })
  }

  return platformExtensions.concat(CONFIG.extensions)
}

const mapPlatform = (
  platform: string,
): 'node' | 'browser' | 'neutral' | undefined => {
  if (platform === 'node') return 'node'
  if (platform === 'browser') return 'browser'
  return 'neutral'
}

const loadPlugins = ({
  file,
  typesFilePath,
}: {
  file: string
  typesFilePath?: string
}) => {
  const plugins: RolldownPlugin[] = []

  if (CONFIG.typescript && typesFilePath) {
    plugins.push(
      ...(dts({
        tsconfig: 'tsconfig.json',
      }) as RolldownPlugin[]),
    )
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

    plugins.push(visualizer(visualiserOptions) as RolldownPlugin)
  }

  if (CONFIG.filesize) {
    plugins.push(filesize() as RolldownPlugin)
  }

  return plugins
}

const buildDefineOptions = (env: string, platform: string) => {
  if (!CONFIG.replaceGlobals) return undefined

  const defineOptions: Record<string, string> = {
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
    defineOptions['process.env.NODE_ENV'] = JSON.stringify(env)
  }

  return defineOptions
}

const rolldownConfig = ({
  file,
  format,
  env,
  typesFilePath,
  platform,
}: Record<string, any>) => {
  const extensions = defineExtensions(platform)
  const plugins = loadPlugins({ file, typesFilePath })
  const define = buildDefineOptions(env, platform)

  const buildOutput = {
    input: CONFIG.sourceDir,
    platform: mapPlatform(platform),
    tsconfig: CONFIG.typescript ? 'tsconfig.json' : undefined,
    resolve: {
      extensions,
    },
    transform: define ? { define } : undefined,
    output: {
      file,
      format,
      globals: swapGlobals(CONFIG.globals),
      sourcemap: true,
      exports: ['cjs', 'umd'].includes(format) ? ('named' as const) : undefined,
      name: ['umd', 'iife'].includes(format) ? PKG.bundleName : undefined,
      esModule: true,
      minify: env === 'production',
    },
    external: [...PKG.externalDependencies, ...CONFIG.external],
    plugins,
  }

  return buildOutput
}

export default rolldownConfig
