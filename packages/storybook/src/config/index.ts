import baseConfig from './baseConfig.js'
import { TS_CONFIG, VL_CONFIG } from './initialConfig.js'
import { setConfig } from './root.js'

const { config } = VL_CONFIG.merge(baseConfig)

const isMonorepo = process.env.VL_MONOREPO === '1'
const storiesPatterns = isMonorepo
  ? config.monorepoStoriesDir
  : config.storiesDir

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: storiesPatterns.map((item: string) => `${process.cwd()}${item}`),
}

setConfig(updatedConfig)

export { updatedConfig as CONFIG, TS_CONFIG }
export type { StoriesConfig, VLToolsConfig } from '../types.js'
