import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const VL_CONFIG_FILES = ['vl-tools.config.mjs']
const PACKAGE_FILE_NAME = 'package.json'
const TYPESCRIPT_FILE_NAME = 'tsconfig.json'

// --------------------------------------------------------
// Utility helpers (replaces lodash-es and find-up)
// --------------------------------------------------------
const get = (obj: any, dotPath: string, defaultValue: any = {}): any => {
  const keys = dotPath.split('.')
  let result = obj

  for (const key of keys) {
    if (result == null) return defaultValue
    result = result[key]
  }

  return result === undefined ? defaultValue : result
}

const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> => {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    const srcVal = source[key]
    const tgtVal = result[key]

    if (
      typeof srcVal === 'object' &&
      srcVal !== null &&
      !Array.isArray(srcVal) &&
      typeof tgtVal === 'object' &&
      tgtVal !== null &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal)
    } else {
      result[key] = srcVal
    }
  }

  return result
}

const findFileUp = (
  names: string | string[],
  cwd = process.cwd(),
): string | undefined => {
  const fileNames = Array.isArray(names) ? names : [names]
  let dir = path.resolve(cwd)

  while (true) {
    for (const name of fileNames) {
      const filePath = path.join(dir, name)
      try {
        if (fs.statSync(filePath).isFile()) return filePath
      } catch (_e) {
        // file doesn't exist, continue
      }
    }

    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

// --------------------------------------------------------
// FIND & READ file helpers
// --------------------------------------------------------
const findFile = (filename: string) => findFileUp(filename)

const loadFileToJSON = (filename: string): Record<string, any> => {
  const file = findFile(filename)
  if (!file) return {}

  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (_e) {
    return {}
  }
}

const loadModuleAsync = async (
  filePath: string,
): Promise<Record<string, any>> => {
  try {
    const mod = await import(pathToFileURL(filePath).href)
    return mod?.default ?? mod ?? {}
  } catch (e: any) {
    console.warn(
      `[tools-core] Failed to load config: ${filePath}\n  ${e.message}`,
    )
    return {}
  }
}

// --------------------------------------------------------
// GET PACKAGE.JSON info
// --------------------------------------------------------
const getPackageJSON = () => loadFileToJSON(PACKAGE_FILE_NAME)

// --------------------------------------------------------
// PACKAGE.json parsing functions
// --------------------------------------------------------

// GET LIST OF DEPENDENCIES from package.json
const getDependenciesList = (types: any) => {
  const pkg = getPackageJSON()
  let result: any = []

  types.forEach((item: any) => {
    const data = pkg[item]
    result = [...result, ...Object.keys(data || {})]
  })

  return result
}

// converts package name to umd or iife valid format
// example: napespace-package-name => namespacePackageName
const camelspaceBundleName = (name: string) => {
  const parsedName = name.replace('@', '').replace('/', '-')
  const toCamelCase = (items: any) =>
    items.map((item: any, i: any) =>
      i === 0
        ? item
        : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
    )
  const parts = parsedName.split('-')
  const result = toCamelCase(parts).join('')

  return result
}

// --------------------------------------------------------
// PACKAGE JSON DATA
// --------------------------------------------------------
const getPkgData = (): Record<string, any> => {
  const pkg = getPackageJSON()
  const { name } = pkg

  return {
    ...pkg,
    bundleName: camelspaceBundleName(name),
    externalDependencies: getDependenciesList([
      'dependencies',
      'peerDependencies',
    ]),
  }
}

// --------------------------------------------------------
// LOAD EXTERNAL CONFIGURATION
// Cascading: finds all vl-tools.config.mjs files from
// cwd upward, then deep-merges them (root first, closest
// package config wins).
// --------------------------------------------------------
const findAllConfigFiles = (): string[] => {
  const files: string[] = []
  let cwd = process.cwd()

  while (true) {
    const file = findFileUp(VL_CONFIG_FILES, cwd)
    if (!file) break
    files.push(file)
    const parentDir = path.dirname(path.dirname(file))
    if (parentDir === path.dirname(file)) break
    cwd = parentDir
  }

  // Root config first, closest config last (overrides)
  return files.reverse()
}

const getExternalConfig = async (): Promise<Record<string, any>> => {
  const files = findAllConfigFiles()
  let config: Record<string, any> = {}

  for (const file of files) {
    const loaded = await loadModuleAsync(file)
    config = deepMerge(config, loaded)
  }

  return config
}

const loadConfigParam =
  (filename: string) =>
  (key: string, defaultValue = {}) => {
    const externalConfig = loadFileToJSON(filename)

    return get(externalConfig, key, defaultValue)
  }

const loadVLToolsConfig = async () => {
  const externalConfig = await getExternalConfig()

  const cloneAndEnhance = (object: Record<string, any>) => ({
    get config() {
      return object
    },
    get: (param: string, defaultValue?: any) =>
      get(object, param, defaultValue || {}),
    merge: (param: Record<string, any>) =>
      cloneAndEnhance(deepMerge(param, object)),
  })

  const getOutput = (key: string) => {
    const result = get(externalConfig, key, {})

    return cloneAndEnhance(result)
  }

  return getOutput
}

const defineConfig = <T extends Record<string, any>>(config: T): T => config

const swapGlobals = (globals: Record<string, string>) =>
  Object.entries(globals).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[value] = key
      return acc
    },
    {},
  )

const PKG = getPkgData()
const VL_CONFIG = await loadVLToolsConfig()
const TS_CONFIG = loadFileToJSON(TYPESCRIPT_FILE_NAME)

export {
  defineConfig,
  findFile,
  loadConfigParam,
  loadFileToJSON,
  loadVLToolsConfig,
  swapGlobals,
  PKG,
  VL_CONFIG,
  TS_CONFIG,
}
