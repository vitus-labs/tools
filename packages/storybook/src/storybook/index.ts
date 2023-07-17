import path from 'node:path'
import { URL } from 'node:url'
import { CONFIG } from '../config/index.js'

const newDirname = new URL('.', import.meta.url).pathname

const storybookConfigDir = path.resolve(newDirname)

const storybookStandalone = {
  mode: 'dev',
  port: CONFIG.port,
  configDir: storybookConfigDir,
}

const storybookBuild = {
  mode: 'static',
  outputDir: CONFIG.outputDir,
  configDir: storybookConfigDir,
}

export { storybookStandalone, storybookBuild }
