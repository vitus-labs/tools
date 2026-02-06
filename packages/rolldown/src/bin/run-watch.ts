#!/usr/bin/env node
import chalk from 'chalk'
import { watch } from 'rolldown'
import {
  createBuildPipeline,
  config as rolldownConfig,
} from '../rolldown/index.js'

const { log } = console
const allBuilds = createBuildPipeline()

const watchConfigs = allBuilds.map((item) => {
  const { output, ...input } = rolldownConfig(item)
  return { ...input, output }
})

log(chalk.blue('Starting watch mode...'))

const watcher = watch(watchConfigs)

watcher.on('event', (event) => {
  switch (event.code) {
    case 'START':
      log(chalk.blue('Rebuilding...'))
      break
    case 'BUNDLE_END':
      log(
        chalk.green(`Built in ${event.duration}ms`),
        chalk.gray(`(${event.output.join(', ')})`),
      )
      event.result.close()
      break
    case 'END':
      log(chalk.blue('Watching for changes...'))
      break
    case 'ERROR':
      log(chalk.red('Build error:'), event.error)
      break
  }
})

process.on('SIGINT', () => {
  log(chalk.yellow('\nStopping watch mode...'))
  watcher.close()
  process.exit(0)
})
