/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const findUp = require('find-up')
const merge = require('lodash.merge')
const get = require('lodash.get')

// --------------------------------------------------------
// FIND & READ file helpers
// --------------------------------------------------------
const findFile = (filename) => findUp.sync(filename, { type: 'file' })
// const findFilePath = (filename) => findFile(filename).replace(filename, '')

const loadFile = (filename) => {
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
// LOAD EXTERNAL CONFIGURATION
// --------------------------------------------------------
const getExternalConfig = () => loadFile('vl-tools.config.js')

const loadConfig = (config) => {
  const externalConfig = getExternalConfig()

  return merge(config, get(externalConfig, 'stories'))
}

module.exports = {
  loadConfig,
  CONFIG: getExternalConfig(),
  findFile,
  loadFile,
}
