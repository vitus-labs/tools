import { VL_CONFIG as loadConfig, TS_CONFIG } from '@vitus-labs/tools-core'
import baseConfig from './baseConfig.ts'

const { config } = loadConfig('stories').merge(baseConfig)

const isMonorepo = process.env.VL_MONOREPO === '1'
const storiesPatterns = isMonorepo
  ? config.monorepoStoriesDir
  : config.storiesDir

// Storybook only calls indexers for files matched by the `stories` globs,
// so component index files must be added to them for auto-discovery to run.
const discoveryPatterns: string[] = config.autoDiscovery
  ? ((isMonorepo ? config.monorepoAutoDiscoveryDir : config.autoDiscoveryDir) ??
    [])
  : []

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: [...storiesPatterns, ...discoveryPatterns].map(
    (item: string) => `${process.cwd()}${item}`,
  ),
}

export type { StoriesConfig, VLToolsConfig } from '../types.ts'
export { TS_CONFIG, updatedConfig as CONFIG }
