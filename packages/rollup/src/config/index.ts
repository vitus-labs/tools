import { loadVLToolsConfig, PKG } from '@vitus-labs/tools-core'
import baseConfig from './baseConfig'

const CONFIG_KEY = 'rollup'

const CONFIG = loadVLToolsConfig(CONFIG_KEY).merge(baseConfig).config

const PLATFORMS = ['browser', 'node', 'web', 'native']

export { CONFIG, PKG, PLATFORMS }
