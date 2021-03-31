const dts = require('rollup-plugin-dts')
const baseConfig = require('./baseConfig')
const { PKG, loadConfig } = require('../utils')

const CONFIG = loadConfig(baseConfig)

const typescriptConfig = () => ({
  input: CONFIG.typesDir,
  output: [{ file: PKG.typings || PKG.types, format: 'es' }],
  plugins: [dts()],
})

module.exports = typescriptConfig
