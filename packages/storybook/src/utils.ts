import { loadVLToolsConfig, loadConfigParam } from '@vitus-labs/tools-core'

export const VL_CONFIG = await loadVLToolsConfig('stories')
export const TS_CONFIG = await loadConfigParam('tsconfig.json')
