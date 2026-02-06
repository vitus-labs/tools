import baseConfig from './baseConfig.js'
import { TS_CONFIG, VL_CONFIG } from './initialConfig.js'
import { setConfig } from './root.js'

const { config } = VL_CONFIG.merge(baseConfig)

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: config.storiesDir.map((item) => `${process.cwd()}${item}`),
}

setConfig(updatedConfig)

export { updatedConfig as CONFIG, TS_CONFIG }
