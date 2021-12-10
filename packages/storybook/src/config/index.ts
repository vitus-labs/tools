import { loadConfig } from '../utils'
import baseConfig from './baseConfig'
import { updateConfig, getConfig } from './root'

const config = loadConfig(baseConfig)

console.log('config - config')
console.log(config)

const updatedConfig = {
  ...config,
  outDir: `${process.cwd()}${config.outDir}`,
  storiesDir: config.storiesDir.map((item) => `${process.cwd()}${item}`),
}

console.log('updatedConfig')
console.log(updatedConfig)

updateConfig(updateConfig)

export { getConfig }

export default updatedConfig
