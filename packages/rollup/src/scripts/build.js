/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk')
const rimraf = require('rimraf')
const rollup = require('rollup')
const { rollupConfig, baseConfig } = require('../config')
const { loadConfig } = require('../utils')
const createBuildPipeline = require('./utils')

const { log } = console
const CONFIG = loadConfig(baseConfig)

// --------------------------------------------------------
// BUILD rollup
// --------------------------------------------------------
async function build({ inputOptions, outputOptions }) {
  const bundle = await rollup.rollup(inputOptions)

  await bundle.write(outputOptions)
}

// --------------------------------------------------------
// SERIALIZE ALL BUILDS
// --------------------------------------------------------
const createBuilds = async () => {
  let p = Promise.resolve() // Q() in q

  // serialize builds
  createBuildPipeline().forEach((item) => {
    const { output, ...input } = rollupConfig(item)

    p = p.then(() => build({ inputOptions: input, outputOptions: output }))
  })

  p.catch((e) => {
    log(`${chalk.bold.bgRed('ERROR')} Something went wrong`)
    log(e)
  })

  return p
}

const runBuild = () => {
  // --------------------------------------------------------
  // (1) delete build folder first
  // --------------------------------------------------------
  log(`${chalk.bold.bgGreen('[1/4]')} Cleaning up old build folder...`)

  rimraf.sync(`${process.cwd()}/${CONFIG.outputDir}`)

  log(`${chalk.bold.bgGreen('[2/4]')} Old build removed`)

  // --------------------------------------------------------
  // (2) build
  // --------------------------------------------------------
  log(`${chalk.bold.bgGreen('[3/4]')} Generating builds...`)
  createBuilds()
}

module.exports = runBuild
