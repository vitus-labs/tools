import type {
  NextConfig,
  OptimizedImagesConfig,
  UrlLoaderOptions,
} from '../types.js'
import { getFileLoaderOptions, getFileLoaderPath } from './file-loader.js'

/**
 * Build options for the webpack url loader.
 */
const getUrlLoaderOptions = (
  { inlineImageLimit, ...optimizedConfig }: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
): UrlLoaderOptions => ({
  ...getFileLoaderOptions(optimizedConfig, nextConfig, isServer),
  limit: inlineImageLimit,
  fallback: getFileLoaderPath(),
})

export { getUrlLoaderOptions }
