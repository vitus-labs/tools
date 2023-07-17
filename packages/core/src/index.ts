import fs from 'node:fs'
import { findUpSync } from 'find-up'
import { get as _get, merge } from 'lodash-es'

const VITUS_LABS_FILE_NAME = 'vl-tools.config.mjs'
const PACKAGE_FILE_NAME = 'package.json'
const TYPESCRIPT_FILE_NAME = 'tsconfig.json'

// --------------------------------------------------------
// FIND & READ file helpers
// --------------------------------------------------------
const findFile = async (filename: string) =>
  findUpSync(filename, { type: 'file' })

const loadFileToJSON = async (filename: string) => {
  const file = await findFile(filename)

  if (!file) return {}

  let data

  // try to read an exported module first
  try {
    const importedFile = await import(file)
    console.log(importedFile.default)
    data = importedFile.default
  } catch (e) {
    // ignore eror
  }

  // try to read a plain json file like tsconfig.json
  if (!data) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (e) {
      // ignore error
    }
  }

  return data
}

// --------------------------------------------------------
// GET PACKAGE.JSON info
// --------------------------------------------------------
const getPackageJSON = async () => {
  const data = await loadFileToJSON(PACKAGE_FILE_NAME)

  return data
}

// --------------------------------------------------------
// PACKAGE.json parsing functions
// --------------------------------------------------------

// GET LIST OF DEPENDENCIES from package.json
const getDependenciesList = async (types: any) => {
  const pkg = await getPackageJSON()
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
        : item.charAt(0).toUpperCase() + item.substr(1).toLowerCase()
    )
  const arr = parsedName.split('-')
  const result = arrayStringsCamel(arr).join('')

  return result
}

// --------------------------------------------------------
// PACKAGE JSON DATA
// --------------------------------------------------------
const getPkgData = async () => {
  const pkg = await getPackageJSON()
  const { name } = pkg
  // const namespace = parseNamespace(name)

  return {
    ...pkg,
    // nameWithoutPrefix: name.replace(namespace, '').replace('/', ''),
    // namespace,
    // namespaceName: namespace.replace('@', ''),
    // rootPath: findFilePath('package.json'),
    bundleName: camelspaceBundleName(name),
    externalDependencies: await getDependenciesList([
      'dependencies',
      'peerDependencies',
    ]),
  }
}

// --------------------------------------------------------
// LOAD EXTERNAL CONFIGURATION
// --------------------------------------------------------
const getExternalConfig = async () => loadFileToJSON(VITUS_LABS_FILE_NAME)

const loadConfigParam =
  (filename: string) =>
  async (key: string, defaultValue = {}) => {
    const externalConfig = await loadFileToJSON(filename)

    return _get(externalConfig, key, defaultValue)
  }

const loadVLToolsConfig = async (key: string) => {
  const externalConfig = await getExternalConfig()
  const result = _get(externalConfig, key, {})

  const cloneAndEnhance = (object) => ({
    get config() {
      return object
    },
    get: (param: string, defaultValue?: any) =>
      _get(object, param, defaultValue),
    merge: (param: Record<string, any>) =>
      cloneAndEnhance(merge(param, object)),
  })

  return cloneAndEnhance(result)
}

const swapGlobals = (globals: Record<string, string>) =>
  Object.entries(globals).reduce((acc, [key, value]) => {
    // eslint-disable-next-line no-param-reassign
    acc[value] = key
    return acc
  }, {})

const PKG = await getPkgData()
const VL_CONFIG = await getExternalConfig()
const TS_CONFIG = await loadFileToJSON(TYPESCRIPT_FILE_NAME)

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
