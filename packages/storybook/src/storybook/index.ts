import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONFIG } from '../config/index.ts'

const newDirname = fileURLToPath(new URL('.', import.meta.url))

const storybookConfigDir = path.resolve(newDirname)

const storybookStandalone = {
  mode: 'dev',
  port: CONFIG.port,
  configDir: storybookConfigDir,
}

const storybookBuild = {
  mode: 'static',
  outputDir: CONFIG.outDir,
  configDir: storybookConfigDir,
}

export { storybookBuild, storybookStandalone }
