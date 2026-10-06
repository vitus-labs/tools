#!/usr/bin/env node
import chalk from 'chalk'
import { watch } from 'rollup'
import { PKG } from '../config/index.ts'
import { createBuildPipeline, config as rollupConfig } from '../rollup/index.ts'

const { log } = console
const allBuilds = createBuildPipeline()

const dim = chalk.dim

const watchConfigs = allBuilds.map((item: Record<string, any>) => {
  const { output, ...input } = rollupConfig(item)
  return { ...input, output }
})

log(
  `\n${chalk.bold.bgCyan.black(' rollup ')} ${chalk.bold(PKG.name || '')} ${dim('watch mode')}\n`,
)

const watcher = watch(watchConfigs as any)

watcher.on('event', (event) => {
  switch (event.code) {
    case 'START':
      log(dim('Rebuilding...'))
      break
    case 'BUNDLE_END':
      log(
        `  ${chalk.green('+')} ${dim(event.output.join(', '))} ${dim(`(${event.duration}ms)`)}`,
      )
      event.result.close()
      break
    case 'END':
      log(`${chalk.green('Ready')} ${dim('- waiting for changes...')}\n`)
      break
    case 'ERROR':
      log(`\n${chalk.red('Error')} ${event.error.message || event.error}\n`)
      if ('frame' in event.error && event.error.frame) {
        log(dim(String(event.error.frame)))
      }
      event.result?.close()
      break
  }
})

process.on('SIGINT', () => {
  log(dim('\nStopping...\n'))
  watcher.close().finally(() => process.exit(0))
})
