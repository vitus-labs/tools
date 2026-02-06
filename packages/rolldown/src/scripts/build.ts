import chalk from 'chalk'
import { rimraf } from 'rimraf'
import { rolldown } from 'rolldown'
import { CONFIG, PKG } from '../config/index.js'
import {
  createBuildPipeline,
  config as rolldownConfig,
} from '../rolldown/index.js'

const { log } = console
const allBuilds = createBuildPipeline()
const allBuildsCount = allBuilds.length

const FORMAT_LABEL: Record<string, string> = {
  cjs: 'CJS',
  es: 'ESM',
  umd: 'UMD',
}

const label = (text: string) => chalk.bold.bgCyan.black(` ${text} `)
const dim = chalk.dim
const bold = chalk.bold

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

const createBuilds = async () => {
  let p = Promise.resolve()

  allBuilds.forEach((item) => {
    const { output, ...input } = rolldownConfig(item)
    const format = FORMAT_LABEL[output.format] || output.format
    p = p.then(() => {
      const start = performance.now()

      return build({ inputOptions: input, outputOptions: output }).then(() => {
        const duration = Math.round(performance.now() - start)
        log(
          `  ${chalk.green('+')} ${bold(format)} ${dim('->')} ${dim(output.file)} ${dim(`(${duration}ms)`)}`,
        )
      })
    })
  })

  return p.catch((e) => {
    log(`\n${chalk.bold.red('Build failed')}\n`)
    log(e)
    throw e
  })
}

const runBuild = async () => {
  const start = performance.now()

  log(
    `\n${label('rolldown')} ${bold(PKG.name || '')} ${dim(`v${PKG.version || '0.0.0'}`)}\n`,
  )

  log(`${dim('Cleaning')} ${CONFIG.outputDir}/`)
  rimraf.sync(`${process.cwd()}/${CONFIG.outputDir}`)

  log(
    `${dim('Building')} ${bold(String(allBuildsCount))} bundle${allBuildsCount > 1 ? 's' : ''}...\n`,
  )

  await createBuilds()

  const total = Math.round(performance.now() - start)
  log(`\n${chalk.green('Done')} ${dim(`in ${total}ms`)}\n`)
}

export { runBuild }
