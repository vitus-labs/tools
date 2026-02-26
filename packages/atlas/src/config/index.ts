import { VL_CONFIG } from '@vitus-labs/tools-core'
import type { AtlasConfig } from '../types'
import baseConfig from './baseConfig'

const vlConfig = VL_CONFIG('atlas')
export const CONFIG: Required<AtlasConfig> = vlConfig.merge(baseConfig).config
