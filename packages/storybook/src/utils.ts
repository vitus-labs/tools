import { loadVLToolsConfig, loadConfigParam } from '@vitus-labs/tools-core'

export const VL_CONFIG = loadVLToolsConfig('stories')
export const TS_CONFIG = loadConfigParam('tsconfig.json')
