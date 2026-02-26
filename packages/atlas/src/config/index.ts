import { VL_CONFIG } from '@vitus-labs/tools-core'
import type { AtlasConfig } from '../types.js'
import baseConfig from './baseConfig.js'

const vlConfig = VL_CONFIG('atlas')
export const CONFIG: Required<AtlasConfig> = vlConfig.merge(baseConfig).config
