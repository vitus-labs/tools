import fs from 'node:fs'
import { createRequire } from 'node:module'
import { findUpSync } from 'find-up'
import { get as _get, merge } from 'lodash-es'

const VITUS_LABS_FILE_NAME = 'vl-tools.config.js'
const PACKAGE_FILE_NAME = 'package.json'
const TYPESCRIPT_FILE_NAME = 'tsconfig.json'

const require = createRequire(import.meta.url)

// --------------------------------------------------------
// FIND & READ file helpers
// --------------------------------------------------------
const findFile = (filename: string) => findUpSync(filename, { type: 'file' })

const loadFileToJSON = (filename: string): Record<string, any> => {
  const file = findFile(filename)

  if (!file) return {}

  let data: Record<string, any> = {}

  // try to read an exported module first
  try {
    const importedFile = require(file)

    if (importedFile) {
      data = importedFile
    }
  } catch (_e) {
    // ignore error
  }

  // try to read a plain json file like tsconfig.json
  if (!data) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (_e) {
      // ignore error
    }
  }

  return data
}

// --------------------------------------------------------
// GET PACKAGE.JSON info
// --------------------------------------------------------
const getPackageJSON = () => {
  const data = loadFileToJSON(PACKAGE_FILE_NAME)

  return data
}

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

// parse namespace name
// const parseNamespace = (name) =>
//   name.startsWith('@') ? name.split('/')[0] : ''

// converts package name to umd or iife valid format
// example: napespace-package-name => namespacePackageName
const camelspaceBundleName = (name: string) => {
  const parsedName = name.replace('@', '').replace('/', '-')
  const arrayStringsCamel = (arr: any) =>
    arr.map((item: any, i: any) =>
      i === 0
        ? item
        : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
    )
  const arr = parsedName.split('-')
  const result = arrayStringsCamel(arr).join('')

  return result
}

// --------------------------------------------------------
// PACKAGE JSON DATA
// --------------------------------------------------------
const getPkgData = (): Record<string, any> => {
  const pkg = getPackageJSON()
  const { name } = pkg
  // const namespace = parseNamespace(name)

  return {
    ...pkg,
    // nameWithoutPrefix: name.replace(namespace, '').replace('/', ''),
    // namespace,
    // namespaceName: namespace.replace('@', ''),
    // rootPath: findFilePath('package.json'),
    bundleName: camelspaceBundleName(name),
    externalDependencies: getDependenciesList([
      'dependencies',
      'peerDependencies',
    ]),
  }
}

// --------------------------------------------------------
// LOAD EXTERNAL CONFIGURATION
// --------------------------------------------------------
const getExternalConfig = () => loadFileToJSON(VITUS_LABS_FILE_NAME)

const loadConfigParam =
  (filename: string) =>
  (key: string, defaultValue = {}) => {
    const externalConfig = loadFileToJSON(filename)

    return _get(externalConfig, key, defaultValue)
  }

const loadVLToolsConfig = () => {
  const externalConfig = getExternalConfig()

  const cloneAndEnhance = (object: Record<string, any>) => ({
    get config() {
      return object
    },
    get: (param: string, defaultValue?: any) =>
      _get(object, param, defaultValue || {}),
    merge: (param: Record<string, any>) =>
      cloneAndEnhance(merge(object, param)),
  })

  const getOutput = (key: string) => {
    const result = _get(externalConfig, key, {})

    return cloneAndEnhance(result)
  }

  return getOutput
}

const swapGlobals = (globals: Record<string, string>) =>
  Object.entries(globals).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[value] = key
      return acc
    },
    {},
  )

const PKG = getPkgData()
const VL_CONFIG = loadVLToolsConfig()
const TS_CONFIG = loadFileToJSON(TYPESCRIPT_FILE_NAME)

export {
  findFile,
  loadConfigParam,
  loadFileToJSON,
  loadVLToolsConfig,
  swapGlobals,
  PKG,
  VL_CONFIG,
  TS_CONFIG,
}
