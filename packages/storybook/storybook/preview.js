/* eslint-disable @typescript-eslint/no-var-requires */
const { preview } = require('../lib/vitus-labs-tools-storybook')

const { decorators, parameters, globals, extendWindow } = preview

window.__VITUS_LABS_STORIES__ = extendWindow
window.__STORY__ = globals

module.exports.decorators = decorators
module.exports.parameters = parameters
