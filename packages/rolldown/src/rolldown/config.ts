import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expandExternal, swapGlobals } from '@vitus-labs/tools-core'
import type { RolldownPlugin } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'
import { CONFIG, PKG, PLATFORMS } from '../config/index.ts'

const require = createRequire(import.meta.url)
const filesize: typeof import('rollup-plugin-filesize').default = require('rollup-plugin-filesize')

const resolveExternals = (): (string | RegExp)[] =>
  CONFIG.bundleAll
    ? []
    : [...PKG.externalDependencies, ...CONFIG.external].map(expandExternal)

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

const loadPlugins = ({ file }: { file: string }) => {
  const plugins: RolldownPlugin[] = []

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
  platform,
  input: entryInput,
}: Record<string, any>) => {
  const extensions = defineExtensions(platform)
  const builtinPlugins = loadPlugins({ file })
  const userPlugins = (CONFIG.plugins || []) as RolldownPlugin[]
  const define = buildDefineOptions(env, platform)

  const lastSlash = file.lastIndexOf('/')
  const dir = lastSlash >= 0 ? file.substring(0, lastSlash) : '.'
  const entryFileName = lastSlash >= 0 ? file.substring(lastSlash + 1) : file

  const external = resolveExternals()

  const buildOutput = {
    input: entryInput || CONFIG.sourceDir,
    platform: mapPlatform(platform),
    tsconfig: CONFIG.typescript ? 'tsconfig.json' : undefined,
    resolve: {
      extensions,
      alias: CONFIG.alias || undefined,
    },
    transform: define ? { define } : undefined,
    output: {
      dir,
      entryFileNames: entryFileName,
      format,
      globals: swapGlobals(CONFIG.globals),
      sourcemap: CONFIG.sourcemap,
      sourcemapIgnoreList: (relativeSourcePath: string) =>
        relativeSourcePath.includes('node_modules'),
      exports: ['cjs', 'umd', 'iife'].includes(format)
        ? ('named' as const)
        : undefined,
      name: ['umd', 'iife'].includes(format) ? PKG.bundleName : undefined,
      esModule: true,
      minify: env === 'production',
      banner: CONFIG.banner || undefined,
      footer: CONFIG.footer || undefined,
    },
    external,
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [...builtinPlugins, ...userPlugins],
  }

  return buildOutput
}

const createDtsConfig = (typesFilePath: string, inputFile: string) => {
  const lastSlash = typesFilePath.lastIndexOf('/')
  const dir = lastSlash >= 0 ? typesFilePath.substring(0, lastSlash) : '.'
  const entryFileName =
    lastSlash >= 0 ? typesFilePath.substring(lastSlash + 1) : typesFilePath

  return {
    file: typesFilePath,
    input: inputFile,
    tsconfig: 'tsconfig.json',
    resolve: {
      extensions: CONFIG.extensions,
    },
    external: resolveExternals(),
    plugins: [
      ...(dts({
        tsconfig: 'tsconfig.json',
        emitDtsOnly: true,
      }) as RolldownPlugin[]),
    ],
    output: {
      dir,
      entryFileNames: entryFileName,
      chunkFileNames: '[name].d.ts',
      format: 'es' as const,
      sourcemap: false,
      esModule: true,
    },
  }
}

/** Check if exports object uses subpath keys */
const isSubpathExports = (obj: Record<string, any>): boolean =>
  Object.keys(obj).some((k) => k === '.' || k.startsWith('./'))

/** Resolve the actual source file extension (.ts, .tsx, etc.) */
const resolveWithExtension = (path: string): string => {
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    if (existsSync(`${path}${ext}`)) return `${path}${ext}`
  }
  return `${path}.ts`
}

/** Resolve input .ts file from a subpath export key using convention. */
const resolveSubpathInput = (exportPath: string): string => {
  if (exportPath === '.') return `${CONFIG.sourceDir}/index.ts`
  const subpath = exportPath.slice(2)
  return `${CONFIG.sourceDir}/${subpath}`
}

const buildDts = (): ReturnType<typeof createDtsConfig> | null => {
  if (!CONFIG.typescript) return null

  // Simple case: no subpath exports
  const typesFilePath = PKG?.exports?.types || PKG.types || PKG.typings
  if (typesFilePath) {
    return createDtsConfig(typesFilePath, `${CONFIG.sourceDir}/index.ts`)
  }

  return null
}

/** Build DTS configs for all subpath exports that have a `types` field */
const buildAllDts = (): ReturnType<typeof createDtsConfig>[] => {
  if (!CONFIG.typescript) return []

  const exportsOptions = PKG.exports
  if (
    !exportsOptions ||
    typeof exportsOptions !== 'object' ||
    !isSubpathExports(exportsOptions)
  ) {
    const single = buildDts()
    return single ? [single] : []
  }

  const results: ReturnType<typeof createDtsConfig>[] = []
  for (const [exportPath, exportConfig] of Object.entries(exportsOptions)) {
    if (!exportConfig || typeof exportConfig !== 'object') continue
    const typesPath = (exportConfig as Record<string, string>).types
    if (!typesPath) continue
    const resolved = resolveSubpathInput(exportPath)
    const inputFile =
      resolved.endsWith('.ts') || resolved.endsWith('.tsx')
        ? resolved
        : resolveWithExtension(resolved)
    results.push(createDtsConfig(typesPath, inputFile))
  }

  return results
}

export default rolldownConfig
export { buildAllDts, buildDts }
