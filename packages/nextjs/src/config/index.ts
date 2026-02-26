import { VL_CONFIG } from '@vitus-labs/tools-core'
import type { NextjsToolsConfig } from '../types'
import baseConfig from './baseConfig'

const CONFIG_KEY = 'next'

const vlConfig = VL_CONFIG(CONFIG_KEY)
const CONFIG: Required<NextjsToolsConfig> = vlConfig.merge(baseConfig).config

export { CONFIG }
