/* eslint-disable @typescript-eslint/no-var-requires */
const { preview } = require('../lib/vitus-labs-tools-storybook')

const { decorators, parameters, globals } = preview

// define configuration globally in window so it can be accessible from anywhere in the browser
// eslint-disable-next-line no-underscore-dangle
window.__VITUS_LABS_STORIES__ = __VITUS_LABS_STORIES__
window.__STORY__ = globals

module.exports.decorators = decorators
module.exports.parameters = parameters
