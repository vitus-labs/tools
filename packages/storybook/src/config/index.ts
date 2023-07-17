import { VL_CONFIG, TS_CONFIG } from './initialConfig'
import baseConfig from './baseConfig'
import { setConfig } from './root'

const { config } = VL_CONFIG.merge(baseConfig)

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: config.storiesDir.map((item) => `${process.cwd()}${item}`),
}

setConfig(updatedConfig)

export { updatedConfig as CONFIG, TS_CONFIG }
