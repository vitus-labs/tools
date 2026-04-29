import { VL_CONFIG } from '@vitus-labs/tools-core'
import type { AtlasConfig } from '../types.ts'
import baseConfig from './baseConfig.ts'

const vlConfig = VL_CONFIG('atlas')
export const CONFIG: Required<AtlasConfig> = vlConfig.merge(baseConfig).config
