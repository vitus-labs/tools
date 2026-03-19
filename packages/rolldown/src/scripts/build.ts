import { cpSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { rimraf } from 'rimraf'
import { rolldown } from 'rolldown'
import { CONFIG, PKG } from '../config/index.js'
import {
  buildAllDts,
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
  iife: 'IIFE',
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

  allBuilds.forEach((item: Record<string, any>) => {
    const { output, ...input } = rolldownConfig(item)
    const format = FORMAT_LABEL[output.format] || output.format
    p = p.then(() => {
      const start = performance.now()

      return build({ inputOptions: input, outputOptions: output })
        .then(() => {
          const duration = Math.round(performance.now() - start)
          log(
            `  ${chalk.green('+')} ${bold(format)} ${dim('->')} ${dim(`${output.dir}/${output.entryFileNames}`)} ${dim(`(${duration}ms)`)}`,
          )
        })
        .catch((e) => {
          log(`\n${chalk.bold.red('Build failed')}`)
          log(chalk.gray(`  Format: ${format}`))
          log(chalk.gray(`  File:   ${output.dir}/${output.entryFileNames}`))
          log(e)
          throw e
        })
    })
  })

  return p
}

const copyStaticFiles = () => {
  if (!Array.isArray(CONFIG.copyFiles) || CONFIG.copyFiles.length === 0) return

  log(`\n${dim('Copying')} static files...\n`)
  for (const { from, to } of CONFIG.copyFiles as {
    from: string
    to: string
  }[]) {
    cpSync(from, to, { recursive: true })
    log(`  ${chalk.green('+')} ${dim(from)} ${dim('->')} ${dim(to)}`)
  }
}

/**
 * Build a single DTS entry in an isolated temp directory, then move the
 * largest .d.ts file (the real declarations) to the final output path.
 *
 * Rolldown code-splits DTS output: the entry file is a tiny re-export stub,
 * and the actual types go into a chunk. Building into a temp dir avoids
 * collisions when multiple DTS entries share the same output directory.
 */
const buildDtsIsolated = async (
  dtsConfig: ReturnType<typeof buildAllDts>[number],
) => {
  const { output, file, ...input } = dtsConfig
  const finalDir = output.dir as string
  const entryName = output.entryFileNames as string
  const tempDir = join(finalDir, `__dts_tmp_${entryName.replace(/\W/g, '_')}`)

  // Build into isolated temp directory
  const tempOutput = { ...output, dir: tempDir }
  await build({ inputOptions: input, outputOptions: tempOutput })

  // Find the largest .d.ts file — that's the real declarations
  const absTempDir = join(process.cwd(), tempDir)
  const dtsFiles = readdirSync(absTempDir).filter((f) => f.endsWith('.d.ts'))

  let bestFile = dtsFiles[0] || entryName
  let bestSize = 0
  for (const f of dtsFiles) {
    const size = statSync(join(absTempDir, f)).size
    if (size > bestSize) {
      bestSize = size
      bestFile = f
    }
  }

  // Move the best file to the final location
  const absFinalDir = join(process.cwd(), finalDir)
  mkdirSync(absFinalDir, { recursive: true })
  renameSync(join(absTempDir, bestFile), join(absFinalDir, entryName))

  // Move sourcemap if it exists
  const mapName = `${bestFile}.map`
  try {
    renameSync(join(absTempDir, mapName), join(absFinalDir, `${entryName}.map`))
  } catch {
    // sourcemap may not exist
  }

  // Clean up temp directory
  rimraf.sync(absTempDir)
}

const generateDeclarations = async () => {
  const dtsConfigs = buildAllDts()
  if (dtsConfigs.length === 0) return

  log(`\n${dim('Generating')} declarations...`)

  for (const dtsFile of dtsConfigs) {
    const tscStart = performance.now()
    await buildDtsIsolated(dtsFile)

    const tscDuration = Math.round(performance.now() - tscStart)
    log(
      `  ${chalk.green('+')} ${bold('DTS')} ${dim('->')} ${dim(dtsFile.file)} ${dim(`(${tscDuration}ms)`)}`,
    )
  }
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
  copyStaticFiles()
  await generateDeclarations()

  const total = Math.round(performance.now() - start)
  log(`\n${chalk.green('Done')} ${dim(`in ${total}ms`)}\n`)
}

export { runBuild }
