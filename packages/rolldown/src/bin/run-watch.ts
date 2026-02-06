#!/usr/bin/env node
import chalk from 'chalk'
import { watch } from 'rolldown'
import { PKG } from '../config/index.js'
import {
  createBuildPipeline,
  config as rolldownConfig,
} from '../rolldown/index.js'

const { log } = console
const allBuilds = createBuildPipeline()

const label = (text: string) => chalk.bold.bgCyan.black(` ${text} `)
const dim = chalk.dim
const bold = chalk.bold

const watchConfigs = allBuilds.map((item) => {
  const { output, ...input } = rolldownConfig(item)
  return { ...input, output }
})

log(`\n${label('rolldown')} ${bold(PKG.name || '')} ${dim('watch mode')}\n`)
log(dim('Waiting for changes...\n'))

const watcher = watch(watchConfigs)

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
      break
  }
})

process.on('SIGINT', () => {
  log(dim('\nStopping...\n'))
  watcher.close()
  process.exit(0)
})
