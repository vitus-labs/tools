import path from 'node:path'
import type {
  DetectedLoaders,
  HandledImageTypes,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.ts'
import { applyFileLoader } from './file-loader.ts'
import { applyImgLoader } from './img-loader.ts'
import { resolveFromProject } from './resolve.ts'
import { applyResponsiveLoader } from './responsive-loader.ts'
import { applyWebpLoader } from './webp-loader.ts'

/**
 * Checks if a node module is installed in the current context.
 */
const isModuleInstalled = (name: string, resolvePath?: string): boolean =>
  resolveFromProject(name, resolvePath) !== undefined

/**
 * Detects all currently installed image optimization loaders.
 */
const detectLoadersUncached = (resolvePath?: string): DetectedLoaders => {
  const jpeg = isModuleInstalled('imagemin-mozjpeg', resolvePath)
    ? 'imagemin-mozjpeg'
    : false
  const gif = isModuleInstalled('imagemin-gifsicle', resolvePath)
    ? 'imagemin-gifsicle'
    : false
  const svg = isModuleInstalled('imagemin-svgo', resolvePath)
    ? 'imagemin-svgo'
    : false
  const svgSprite = isModuleInstalled('svg-sprite-loader', resolvePath)
    ? 'svg-sprite-loader'
    : false
  const webp = isModuleInstalled('webp-loader', resolvePath)
    ? 'webp-loader'
    : false
  const lqip = isModuleInstalled('lqip-loader', resolvePath)
    ? 'lqip-loader'
    : false

  let png: string | false = false
  let responsive: string | false = false
  let responsiveAdapter: string | false = false

  if (isModuleInstalled('imagemin-optipng', resolvePath)) {
    png = 'imagemin-optipng'
  } else if (isModuleInstalled('imagemin-pngquant', resolvePath)) {
    png = 'imagemin-pngquant'
  }

  if (isModuleInstalled('responsive-loader', resolvePath)) {
    responsive = (
      resolveFromProject('responsive-loader', resolvePath) as string
    ).replace(/(\/|\\)lib(\/|\\)index.js$/g, '')

    if (isModuleInstalled('sharp', resolvePath)) {
      responsiveAdapter = 'sharp'
    } else if (isModuleInstalled('jimp', resolvePath)) {
      responsiveAdapter = 'jimp'
    }
  }

  return {
    jpeg,
    gif,
    svg,
    svgSprite,
    webp,
    png,
    lqip,
    responsive,
    responsiveAdapter,
  }
}

const detectedLoadersCache = new Map<string, DetectedLoaders>()

/**
 * Detects installed loaders. Webpack invokes the config function once per
 * compiler (client/server/edge), so results are memoized per base path.
 */
const detectLoaders = (resolvePath?: string): DetectedLoaders => {
  const key = path.resolve(resolvePath ?? process.cwd())
  let detected = detectedLoadersCache.get(key)

  if (!detected) {
    detected = detectLoadersUncached(resolvePath)
    detectedLoadersCache.set(key, detected)
  }

  return detected
}

/**
 * Clears the memoized loader detection (mainly useful for tests).
 */
const clearDetectedLoadersCache = (): void => detectedLoadersCache.clear()

/**
 * Checks which image types should be handled by this plugin.
 */
const getHandledImageTypes = (
  optimizedConfig: OptimizedImagesConfig,
): HandledImageTypes => {
  const { handleImages } = optimizedConfig

  return {
    jpeg: handleImages.indexOf('jpeg') >= 0 || handleImages.indexOf('jpg') >= 0,
    png: handleImages.indexOf('png') >= 0,
    svg: handleImages.indexOf('svg') >= 0,
    webp: handleImages.indexOf('webp') >= 0,
    gif: handleImages.indexOf('gif') >= 0,
    ico: handleImages.indexOf('ico') >= 0,
  }
}

/**
 * Returns the number of image optimization loaders installed.
 */
const getNumOptimizationLoadersInstalled = (loaders: DetectedLoaders): number =>
  Object.values(loaders).filter(
    (loader) =>
      typeof loader === 'string' &&
      (loader.startsWith('imagemin-') ||
        loader.startsWith('webp-') ||
        loader.startsWith('lqip-')),
  ).length

/**
 * Appends all loaders to the webpack configuration.
 */
const appendLoaders = (
  webpackConfig: WebpackConfig,
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  detectedLoaders: DetectedLoaders,
  isServer: boolean,
  optimize: boolean,
): WebpackConfig => {
  let config = webpackConfig
  const handledImageTypes = getHandledImageTypes(optimizedConfig)
  let imgLoaderHandledTypes = handledImageTypes

  // check if responsive-loader should be the default loader and apply it if so
  if (
    optimizedConfig.defaultImageLoader &&
    optimizedConfig.defaultImageLoader === 'responsive-loader'
  ) {
    imgLoaderHandledTypes = {
      ...imgLoaderHandledTypes,
      jpeg: false,
      png: false,
    }

    config = applyResponsiveLoader(
      webpackConfig,
      optimizedConfig,
      nextConfig,
      isServer,
      detectedLoaders,
    )
  }

  // apply img loader
  const shouldApplyImgLoader =
    imgLoaderHandledTypes.jpeg ||
    imgLoaderHandledTypes.png ||
    imgLoaderHandledTypes.gif ||
    imgLoaderHandledTypes.svg

  if (
    (detectedLoaders.jpeg ||
      detectedLoaders.png ||
      detectedLoaders.gif ||
      detectedLoaders.svg) &&
    shouldApplyImgLoader
  ) {
    config = applyImgLoader(
      webpackConfig,
      optimizedConfig,
      nextConfig,
      optimize,
      isServer,
      detectedLoaders,
      imgLoaderHandledTypes,
    )
  } else if (shouldApplyImgLoader) {
    config = applyImgLoader(
      webpackConfig,
      optimizedConfig,
      nextConfig,
      false,
      isServer,
      detectedLoaders,
      imgLoaderHandledTypes,
    )
  }

  // apply webp loader
  if (detectedLoaders.webp && handledImageTypes.webp) {
    config = applyWebpLoader(
      webpackConfig,
      optimizedConfig,
      nextConfig,
      optimize,
      isServer,
      detectedLoaders,
    )
  } else if (handledImageTypes.webp) {
    config = applyWebpLoader(
      webpackConfig,
      optimizedConfig,
      nextConfig,
      false,
      isServer,
      detectedLoaders,
    )
  }

  // apply file loader for non optimizable image types
  if (handledImageTypes.ico) {
    config = applyFileLoader(
      webpackConfig,
      optimizedConfig,
      nextConfig,
      isServer,
      /\.(ico)$/i,
    )
  }

  return config
}

export {
  appendLoaders,
  clearDetectedLoadersCache,
  detectLoaders,
  getHandledImageTypes,
  getNumOptimizationLoadersInstalled,
  isModuleInstalled,
}
