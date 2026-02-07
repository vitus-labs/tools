import {
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { rimraf } from 'rimraf'
import { rolldown } from 'rolldown'
import { CONFIG, PKG } from '../config/index.js'
import {
  createBuildPipeline,
  config as rolldownConfig,
  buildDts,
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
          `  ${chalk.green('+')} ${bold(format)} ${dim('->')} ${dim(`${output.dir}/${output.entryFileNames}`)} ${dim(`(${duration}ms)`)}`,
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

  const dtsFile = buildDts()
  if (dtsFile) {
    log(`\n${dim('Generating')} declarations...`)
    const tscStart = performance.now()

    const { output, file, ...input } = dtsFile
    await build({ inputOptions: input, outputOptions: output })

    // rolldown-plugin-dts may code-split into entry + chunk where the entry
    // is empty and the chunk has all declarations. Fix by replacing the entry
    // with the chunk content.
    const outDir = output.dir as string
    const entryName = output.entryFileNames as string
    const entryPath = join(outDir, entryName)
    const allDts = readdirSync(outDir).filter(
      (f) => f.endsWith('.d.ts') && f !== entryName,
    )

    if (allDts.length === 1 && allDts[0]) {
      const chunkPath = join(outDir, allDts[0])
      const chunkSize = statSync(chunkPath).size
      const entrySize = statSync(entryPath).size

      if (chunkSize > entrySize) {
        unlinkSync(entryPath)
        renameSync(chunkPath, entryPath)
        // also handle sourcemap
        const chunkMap = `${chunkPath}.map`
        const entryMap = `${entryPath}.map`
        try {
          unlinkSync(entryMap)
          renameSync(chunkMap, entryMap)
        } catch {}
      }
    }

    const tscDuration = Math.round(performance.now() - tscStart)
    log(`  ${chalk.green('+')} ${bold('DTS')} ${dim('->')} ${dim(file)} ${dim(`(${tscDuration}ms)`)}`)
  }

  const total = Math.round(performance.now() - start)
  log(`\n${chalk.green('Done')} ${dim(`in ${total}ms`)}\n`)
}

export { runBuild }
