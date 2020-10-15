const path = require('path')
const CONFIG = require('../src/config')

module.exports = {
  stories: CONFIG.stories,
  addons: Object.keys(CONFIG.addons).map((item) => `@storybook/addon-${item}`),

  webpackFinal: async (config) => {
    // eslint-disable-next-line no-param-reassign
    config.resolve.alias['~'] = path.resolve(process.cwd(), 'src/')

    return config
  },
}
