import { VL_CONFIG, TS_CONFIG } from '@vitus-labs/tools-core'

const CONFIG_KEY = 'stories'

export const CONFIG = VL_CONFIG.get(CONFIG_KEY)

export { CONFIG as VL_CONFIG, TS_CONFIG }
