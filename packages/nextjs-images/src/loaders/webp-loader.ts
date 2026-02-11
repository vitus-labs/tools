import type {
  DetectedLoaders,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.js'
import { getResourceQueries } from './resource-queries.js'
import { getUrlLoaderOptions } from './url-loader.js'

/**
 * Build options for the webp loader.
 */
const getWebpLoaderOptions = ({
  webp,
}: Pick<OptimizedImagesConfig, 'webp'>): Record<string, unknown> => webp || {}

/**
 * Apply the webp loader to the webpack configuration.
 */
const applyWebpLoader = (
  webpackConfig: WebpackConfig,
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  optimize: boolean,
  isServer: boolean,
  detectedLoaders: DetectedLoaders,
): WebpackConfig => {
  const webpLoaders: Array<{
    loader: string
    options?: Record<string, unknown>
  }> = [
    {
      loader: 'url-loader',
      options: getUrlLoaderOptions(optimizedConfig, nextConfig, isServer),
    },
  ]

  if (optimize) {
    webpLoaders.push({
      loader: 'webp-loader',
      options: getWebpLoaderOptions(optimizedConfig),
    })
  }

  webpackConfig.module?.rules?.push({
    test: /\.webp$/i,
    oneOf: [
      ...getResourceQueries(
        optimizedConfig,
        nextConfig,
        isServer,
        optimize ? 'webp-loader' : null,
        getWebpLoaderOptions(optimizedConfig),
        detectedLoaders,
      ),
      {
        use: webpLoaders,
      },
    ],
  })

  return webpackConfig
}

/**
 * Returns the resource query definition for converting a jpeg/png image to webp.
 */
const getWebpResourceQuery = (
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
) => {
  const urlLoaderOptions = getUrlLoaderOptions(
    optimizedConfig,
    nextConfig,
    isServer,
  )
  const imageName =
    urlLoaderOptions.name.indexOf('[ext]') >= 0
      ? urlLoaderOptions.name.replace(
          '[ext]',
          optimizedConfig.removeOriginalExtension ? 'webp' : '[ext].webp',
        )
      : `${urlLoaderOptions.name}.webp`

  return {
    resourceQuery: /webp/,
    use: [
      {
        loader: 'url-loader',
        options: {
          ...urlLoaderOptions,
          name: imageName,
          mimetype: 'image/webp',
        },
      },
      {
        loader: 'webp-loader',
        options: getWebpLoaderOptions(optimizedConfig),
      },
    ],
  }
}

export { getWebpLoaderOptions, applyWebpLoader, getWebpResourceQuery }
