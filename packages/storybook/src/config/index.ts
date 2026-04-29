import { VL_CONFIG as loadConfig, TS_CONFIG } from '@vitus-labs/tools-core'
import baseConfig from './baseConfig.ts'

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

export type { StoriesConfig, VLToolsConfig } from '../types.ts'
export { TS_CONFIG, updatedConfig as CONFIG }
