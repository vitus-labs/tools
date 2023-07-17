import { loadVLToolsConfig, PKG, TS_CONFIG } from '@vitus-labs/tools-core'
import baseConfig from './baseConfig.js'

const CONFIG_KEY = 'build'

const CONFIG = (await loadVLToolsConfig(CONFIG_KEY)).merge(baseConfig).config

const PLATFORMS = ['browser', 'node', 'web', 'native'] as const

export { CONFIG, TS_CONFIG, PKG, PLATFORMS }
