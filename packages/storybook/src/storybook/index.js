/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const CONFIG = require('../config')

const storybookConfigDir = path.resolve(`${__dirname}/../storybook`)

const storybookStandalone = {
  mode: 'dev',
  port: CONFIG.port,
  configDir: storybookConfigDir,
}

const storybookBuild = {
  mode: 'static',
  outputDir: CONFIG.outputDir,
  configDir: storybookConfigDir,
}

module.exports.storybookStandalone = storybookStandalone
module.exports.storybookBuild = storybookBuild
