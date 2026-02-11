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

// Dynamic import wrapper invisible to webpack's static analysis,
// avoiding PackFileCacheStrategy build dependency warnings.
const dynamicImport = new Function(
  'moduleName',
  'return import(moduleName)',
) as (moduleName: string) => Promise<Record<string, unknown>>

/**
 * Dynamically imports an imagemin plugin and configures it.
 *
 * Uses dynamic import() because imagemin plugins
 * (e.g. imagemin-mozjpeg) are ESM-only packages.
 */
const importImageminPlugin = async (
  plugin: string,
  nextConfig: NextConfig,
): Promise<unknown> => {
  let moduleName = plugin

  if (nextConfig.overwriteImageLoaderPaths) {
    moduleName = require.resolve(plugin, {
      paths: [nextConfig.overwriteImageLoaderPaths],
    })
  }

  const mod = await dynamicImport(moduleName)
  const pluginFn = (mod.default ?? mod) as (opts: unknown) => unknown

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
): { plugins: unknown[] } | Promise<{ plugins: unknown[] }> => {
  if (!optimize) {
    return { plugins: [] }
  }

  return Promise.all([
    detectedLoaders.jpeg
      ? importImageminPlugin(detectedLoaders.jpeg, nextConfig)
      : undefined,
    detectedLoaders.png
      ? importImageminPlugin(detectedLoaders.png, nextConfig)
      : undefined,
    detectedLoaders.svg
      ? importImageminPlugin(detectedLoaders.svg, nextConfig)
      : undefined,
    detectedLoaders.gif
      ? importImageminPlugin(detectedLoaders.gif, nextConfig)
      : undefined,
  ]).then((plugins) => ({
    plugins: plugins.filter(Boolean),
  }))
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
  ) as unknown as Record<string, unknown>

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
  importImageminPlugin,
  getImgLoaderOptions,
  getHandledFilesRegex,
  applyImgLoader,
}
