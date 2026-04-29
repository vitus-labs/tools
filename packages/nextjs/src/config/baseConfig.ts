import type { NextjsToolsConfig } from '../types.js'

const baseConfig: Required<NextjsToolsConfig> = {
  headers: true,
  images: {},
  transpilePackages: [],
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default baseConfig
