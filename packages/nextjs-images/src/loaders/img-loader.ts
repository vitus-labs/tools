import { createRequire } from 'node:module'
import type {
  DetectedLoaders,
  HandledImageTypes,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.js'
import { getResourceQueries } from './resource-queries.js'
import { getSvgSpriteLoaderResourceQuery } from './svg-sprite-loader/index.js'
import { getUrlLoaderOptions } from './url-loader.js'
import { getWebpResourceQuery } from './webp-loader.js'

const require = createRequire(import.meta.url)

/**
 * Requires an imagemin plugin and configures it.
 */
const requireImageminPlugin = (
  plugin: string,
  nextConfig: NextConfig,
): unknown => {
  let moduleName = plugin

  if (nextConfig.overwriteImageLoaderPaths) {
    moduleName = require.resolve(plugin, {
      paths: [nextConfig.overwriteImageLoaderPaths],
    })
  }

  const pluginFn = require(moduleName)

  return pluginFn(
    (nextConfig as Record<string, unknown>)[plugin.replace('imagemin-', '')] ||
      {},
  )
}

/**
 * Build options for the img loader.
 */
const getImgLoaderOptions = (
  nextConfig: NextConfig,
  detectedLoaders: DetectedLoaders,
  optimize: boolean,
): { plugins: unknown[] } => {
  if (!optimize) {
    return { plugins: [] }
  }

  const plugins = [
    detectedLoaders.jpeg
      ? requireImageminPlugin(detectedLoaders.jpeg, nextConfig)
      : undefined,
    detectedLoaders.png
      ? requireImageminPlugin(detectedLoaders.png, nextConfig)
      : undefined,
    detectedLoaders.svg
      ? requireImageminPlugin(detectedLoaders.svg, nextConfig)
      : undefined,
    detectedLoaders.gif
      ? requireImageminPlugin(detectedLoaders.gif, nextConfig)
      : undefined,
  ].filter(Boolean)

  return { plugins }
}

/**
 * Build the regex for all handled image types.
 */
const getHandledFilesRegex = (handledImageTypes: HandledImageTypes): RegExp => {
  const handledFiles = [
    handledImageTypes.jpeg ? 'jpe?g' : null,
    handledImageTypes.png ? 'png' : null,
    handledImageTypes.svg ? 'svg' : null,
    handledImageTypes.gif ? 'gif' : null,
  ]

  return new RegExp(`\\.(${handledFiles.filter(Boolean).join('|')})$`, 'i')
}

/**
 * Apply the img loader to the webpack configuration.
 */
const applyImgLoader = (
  webpackConfig: WebpackConfig,
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  optimize: boolean,
  isServer: boolean,
  detectedLoaders: DetectedLoaders,
  handledImageTypes: HandledImageTypes,
): WebpackConfig => {
  const imgLoaderOptions = getImgLoaderOptions(
    nextConfig,
    detectedLoaders,
    optimize,
  )

  webpackConfig.module?.rules?.push({
    test: getHandledFilesRegex(handledImageTypes),
    oneOf: [
      ...getResourceQueries(
        optimizedConfig,
        nextConfig,
        isServer,
        optimize ? 'img-loader' : null,
        imgLoaderOptions,
        detectedLoaders,
      ),

      // ?webp: convert an image to webp
      ...(handledImageTypes.webp
        ? [getWebpResourceQuery(optimizedConfig, nextConfig, isServer)]
        : []),

      // ?sprite: add icon to sprite
      ...(detectedLoaders.svgSprite
        ? [
            getSvgSpriteLoaderResourceQuery(
              optimizedConfig,
              detectedLoaders,
              imgLoaderOptions,
              optimize,
            ),
          ]
        : []),

      // default behavior: inline if below the defined limit, external file if above
      {
        use: [
          {
            loader: 'url-loader',
            options: getUrlLoaderOptions(optimizedConfig, nextConfig, isServer),
          },
          {
            loader: 'img-loader',
            options: imgLoaderOptions,
          },
        ],
      },
    ].filter(Boolean),
  })

  return webpackConfig
}

export {
  requireImageminPlugin,
  getImgLoaderOptions,
  getHandledFilesRegex,
  applyImgLoader,
}
