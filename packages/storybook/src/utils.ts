/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs'
import findUp from 'find-up'
import merge from 'lodash.merge'
import get from 'lodash.get'

// --------------------------------------------------------
// FIND & READ file helpers
// --------------------------------------------------------
const findFile = (filename) => findUp.sync(filename, { type: 'file' })
// const findFilePath = (filename) => findFile(filename).replace(filename, '')

const loadFile = (filename) => {
  const file = findFile(filename)
  console.log(file)

  if (!file) return {}

  let data

  // try to read an exported module first
  try {
    data = require(file)
    console.log('require')
    console.log(filename)
    console.log(data)
  } catch (e) {
    // ignore eror
  }

  // try to read a plain json file like tsconfig.json
  if (!data) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'))
      console.log('readfile')
      console.log(filename)
      console.log(data)
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

const loadConfig = (config = {}) => {
  const externalConfig = getExternalConfig()

  console.log('externalConfig')
  console.log(externalConfig)

  return merge(config, get(externalConfig, 'stories'))
}

const CONFIG = getExternalConfig()

export { loadConfig, CONFIG, findFile, loadFile }
