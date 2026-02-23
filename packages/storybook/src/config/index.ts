import { VL_CONFIG as loadConfig, TS_CONFIG } from '@vitus-labs/tools-core'
import baseConfig from './baseConfig.js'

const { config } = loadConfig('stories').merge(baseConfig)

const isMonorepo = process.env.VL_MONOREPO === '1'
const storiesPatterns = isMonorepo
  ? config.monorepoStoriesDir
  : config.storiesDir

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: storiesPatterns.map((item: string) => `${process.cwd()}${item}`),
}

export { updatedConfig as CONFIG, TS_CONFIG }
export type { StoriesConfig, VLToolsConfig } from '../types.js'
