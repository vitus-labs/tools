/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk')
const rimraf = require('rimraf')
const rollup = require('rollup')
const { rollupConfig, baseConfig } = require('../config')
const { loadConfig } = require('../utils')
const createBuildPipeline = require('./utils')

const { log } = console
const CONFIG = loadConfig(baseConfig)
const allBuilds = createBuildPipeline()
// const allBuilds = allBuildOptions.map((item) => rollupConfig(item)).flat()
const allBuildsCount = allBuilds.length

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
  allBuilds.forEach((item, i) => {
    const buildOptions = rollupConfig(item)

    // it might be an array for such a cases like typescript optimization file
    // which we want to do in one iteration only
    if (Array.isArray(buildOptions)) {
      const [buildConfig, typescriptConfig] = buildOptions

      const { output, ...input } = buildConfig
      const { output: tsOutput, ...tsInput } = typescriptConfig

      p = p.then(() => {
        log(chalk.green(`🚧  Creating a build ${i + 1}/${allBuildsCount}`))
        return build({ inputOptions: input, outputOptions: output })
      })

      p = p.then(() =>
        build({ inputOptions: tsInput, outputOptions: tsOutput })
      )
    } else {
      const { output, ...input } = buildOptions

      p = p.then(() => {
        log(chalk.green(`🚧  Creating a build ${i + 1}/${allBuildsCount}`))
        return build({ inputOptions: input, outputOptions: output })
      })
    }
  })

  p.catch((e) => {
    log(
      `${chalk.bold.bgRed.white('⚠️ ERROR')} ${chalk.red(
        'Something went wrong'
      )}`
    )
    log(e)
  })

  return p
}

const runBuild = async () => {
  // --------------------------------------------------------
  // (1) delete build folder first
  // --------------------------------------------------------
  log(
    `${chalk.bold.bgBlue.black('[1/4]')} ${chalk.blue(
      '✂️  Cleaning up old build folder...'
    )}`
  )

  rimraf.sync(`${process.cwd()}/${CONFIG.outputDir}`)

  log(
    `${chalk.bold.bgBlue.black('[2/4]')} ${chalk.blue('☑️  Old build removed')}`
  )

  // --------------------------------------------------------
  // (2) build
  // --------------------------------------------------------
  log(
    `${chalk.bold.bgBlue.black('[3/4]')} ${chalk.blue(
      `💪  Generating ${allBuildsCount} builds in total...`
    )}`
  )

  log('\n')

  await Promise.resolve()
    .then(() => createBuilds())
    .then(() => {
      log(`${chalk.bold.bgBlue.black('[4/4]')} ${chalk.blue('🎉  Done!')}`)
    })
}

module.exports = runBuild
