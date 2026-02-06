import chalk from 'chalk'
import { rimraf } from 'rimraf'
import { rolldown } from 'rolldown'
import { CONFIG } from '../config/index.js'
import {
  createBuildPipeline,
  config as rolldownConfig,
} from '../rolldown/index.js'

const { log } = console
const allBuilds = createBuildPipeline()
const allBuildsCount = allBuilds.length

const MODULE_TYPES: Record<string, string> = {
  cjs: 'CommonJS',
  es: 'ES Module',
  umd: 'UMD module',
}

// --------------------------------------------------------
// BUILD rolldown
// --------------------------------------------------------
async function build({
  inputOptions,
  outputOptions,
}: {
  inputOptions: any
  outputOptions: any
}) {
  const bundle = await rolldown(inputOptions)

  await bundle.write(outputOptions)
  await bundle.close()
}

// --------------------------------------------------------
// SERIALIZE ALL BUILDS
// --------------------------------------------------------
const createBuilds = async () => {
  let p = Promise.resolve()

  // serialize builds
  allBuilds.forEach((item, i) => {
    const { output, ...input } = rolldownConfig(item)
    const type = output.format

    p = p.then(() => {
      log(
        chalk.green(`Building ${i + 1}/${allBuildsCount}`),
        chalk.gray(`(format: ${MODULE_TYPES[type]})`),
      )

      return build({ inputOptions: input, outputOptions: output })
    })
  })

  return p.catch((e) => {
    log(
      `${chalk.bold.bgRed.white('ERROR')} ${chalk.red('Something went wrong')}`,
    )
    log(e)
    throw e
  })
}

const runBuild = async () => {
  // --------------------------------------------------------
  // (1) delete build folder first
  // --------------------------------------------------------
  log(
    `${chalk.bold.bgBlue.black('[1/4]')} ${chalk.blue(
      'Cleaning up old build folder...',
    )}`,
  )

  rimraf.sync(`${process.cwd()}/${CONFIG.outputDir}`)

  log(`${chalk.bold.bgBlue.black('[2/4]')} ${chalk.blue('Old build removed')}`)

  // --------------------------------------------------------
  // (2) build
  // --------------------------------------------------------
  log(
    `${chalk.bold.bgBlue.black('[3/4]')} ${chalk.blue(
      `Generating ${allBuildsCount} builds in total...`,
    )}`,
  )

  log('\n')

  await Promise.resolve()
    .then(() => createBuilds())
    .then(() => {
      log(`${chalk.bold.bgBlue.black('[4/4]')} ${chalk.blue('Done!')}`)
    })
}

export { runBuild }
