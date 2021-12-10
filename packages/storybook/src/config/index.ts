import { loadConfig } from '../utils'
import baseConfig from './baseConfig'
import { setConfig } from './root'

const config = loadConfig(baseConfig)

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: config.storiesDir.map((item) => `${process.cwd()}${item}`),
}

setConfig(updatedConfig)

export default updatedConfig
