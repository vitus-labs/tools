/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const findUp = require('find-up')
const merge = require('lodash.merge')
const get = require('lodash.get')

// --------------------------------------------------------
// FIND & READ file helpers
// --------------------------------------------------------
const findFile = (filename) => findUp.sync(filename, { type: 'file' })

const loadFileToJSON = (filename) => {
  const file = findFile(filename)

  if (!file) return {}

  let data

  // try to read an exported module first
  try {
    data = require(file)
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
const getPackageJSON = () => {
  const data = loadFileToJSON('package.json')

  return data
}

// --------------------------------------------------------
// PACKAGE.json parsing functions
// --------------------------------------------------------

// GET LIST OF DEPENDENCIES from package.json
const getDependenciesList = (types) => {
  const pkg = getPackageJSON()
  let result = []

  types.forEach((item) => {
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
const camelspaceBundleName = (name) => {
  const parsedName = name.replace('@', '').replace('/', '-')
  const arrayStringsCamel = (arr) =>
    arr.map((item, i) =>
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
const getPkgData = () => {
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
const getExternalConfig = () => loadFileToJSON('vl-tools.config.js')

const loadConfig = (key, config = {}) => {
  const externalConfig = getExternalConfig()

  return merge(config, get(externalConfig, key))
}

const swapGlobals = (globals) => {
  const result = {}

  Object.entries(globals).forEach(([key, value]) => {
    result[value] = key
  })

  return result
}

module.exports = {
  findFile,
  loadConfig,
  swapGlobals,
  PKG: getPkgData(),
  CONFIG: getExternalConfig(),
}
