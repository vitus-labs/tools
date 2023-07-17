import { loadVLToolsConfig, TS_CONFIG } from '@vitus-labs/tools-core'

const CONFIG_KEY = 'stories'

const VL_CONFIG = await loadVLToolsConfig(CONFIG_KEY)

// const VL_CONFIG = VL_CONFIG.get(CONFIG_KEY)

export { VL_CONFIG, TS_CONFIG }
