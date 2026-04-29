import type { NextjsToolsConfig } from '../types.ts'

const baseConfig: Required<NextjsToolsConfig> = {
  headers: true,
  images: {},
  transpilePackages: [],
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default baseConfig
