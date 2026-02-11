import { createRequire } from 'node:module'
import path from 'node:path'
import type {
  DetectedLoaders,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.js'
import { getFileLoaderOptions } from './file-loader.js'

const require = createRequire(import.meta.url)

/**
 * Build options for the webpack responsive loader.
 */
const getResponsiveLoaderOptions = (
  { responsive, ...optimizedConfig }: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
  detectedLoaders: DetectedLoaders,
): Record<string, unknown> => {
  let adapter = responsive ? responsive.adapter : undefined

  if (!adapter && detectedLoaders.responsiveAdapter === 'sharp') {
    adapter = require(`${detectedLoaders.responsive}${path.sep}sharp`)
  }

  return {
    ...getFileLoaderOptions(optimizedConfig, nextConfig, isServer),
    name: '[name]-[width]-[hash].[ext]',
    ...(responsive || {}),
    adapter,
  }
}

/**
 * Apply the responsive loader to the webpack configuration.
 */
const applyResponsiveLoader = (
  webpackConfig: WebpackConfig,
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
  detectedLoaders: DetectedLoaders,
): WebpackConfig => {
  webpackConfig.module?.rules?.push({
    test: /\.(jpe?g|png)$/i,
    oneOf: [
      {
        use: {
          loader: 'responsive-loader',
          options: getResponsiveLoaderOptions(
            optimizedConfig,
            nextConfig,
            isServer,
            detectedLoaders,
          ),
        },
      },
    ],
  })

  return webpackConfig
}

export { getResponsiveLoaderOptions, applyResponsiveLoader }
