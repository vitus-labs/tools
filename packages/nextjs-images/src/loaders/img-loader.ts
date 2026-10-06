import { createRequire } from 'node:module'
import type {
  DetectedLoaders,
  HandledImageTypes,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.ts'
import { resolveFromProject, resolveOwnLoader } from './resolve.ts'
import { getResourceQueries } from './resource-queries.ts'
import { getSvgSpriteLoaderResourceQuery } from './svg-sprite-loader/index.ts'
import { getUrlLoaderOptions } from './url-loader.ts'
import { getWebpResourceQuery } from './webp-loader.ts'

const ownRequire = createRequire(import.meta.url)

/**
 * Synchronously loads an imagemin plugin (e.g. imagemin-mozjpeg) from the
 * user's project and configures it with the matching option of the
 * OptimizedImagesConfig (e.g. `mozjpeg`).
 *
 * imagemin plugins are ESM-only packages, so this relies on require(esm)
 * (Node >= 22.12). It has to be synchronous: Next.js does not await the
 * `webpack` config function and img-loader accepts `plugins` as a function
 * that is evaluated synchronously inside the loader.
 */
const importImageminPlugin = (
  plugin: string,
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig = {},
): unknown => {
  const resolved = resolveFromProject(
    plugin,
    nextConfig.overwriteImageLoaderPaths,
  )

  if (!resolved) {
    throw new Error(`[next-optimized-images] Cannot find module "${plugin}"`)
  }

  const mod = ownRequire(resolved) as Record<string, unknown>
  const pluginFn = (mod.default ?? mod) as (opts: unknown) => unknown

  return pluginFn(optimizedConfig[plugin.replace('imagemin-', '')] || {})
}

/**
 * Build options for the img loader.
 *
 * When optimizing, `plugins` is a lazy function (resolved by img-loader inside
 * the loader at build time) and memoized, as it is invoked once per image.
 */
const getImgLoaderOptions = (
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  detectedLoaders: DetectedLoaders,
  optimize: boolean,
): { plugins: unknown[] | (() => unknown[]) } => {
  if (!optimize) {
    return { plugins: [] }
  }

  let plugins: unknown[] | undefined

  return {
    plugins: () => {
      plugins ??= [
        detectedLoaders.jpeg,
        detectedLoaders.png,
        detectedLoaders.svg,
        detectedLoaders.gif,
      ]
        .filter((name): name is string => typeof name === 'string')
        .map((name) => importImageminPlugin(name, optimizedConfig, nextConfig))
        .filter(Boolean)

      return plugins
    },
  }
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
    optimizedConfig,
    nextConfig,
    detectedLoaders,
    optimize,
  ) as Record<string, unknown>
  const imgLoader = resolveOwnLoader('img-loader')

  webpackConfig.module?.rules?.push({
    test: getHandledFilesRegex(handledImageTypes),
    oneOf: [
      ...getResourceQueries(
        optimizedConfig,
        nextConfig,
        isServer,
        optimize ? imgLoader : null,
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
              imgLoader,
            ),
          ]
        : []),

      // default behavior: inline if below the defined limit, external file if above
      {
        use: [
          {
            loader: resolveOwnLoader('url-loader'),
            options: getUrlLoaderOptions(optimizedConfig, nextConfig, isServer),
          },
          {
            loader: imgLoader,
            options: imgLoaderOptions,
          },
        ],
      },
    ].filter(Boolean),
  })

  return webpackConfig
}

export {
  applyImgLoader,
  getHandledFilesRegex,
  getImgLoaderOptions,
  importImageminPlugin,
}
