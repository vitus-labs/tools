import type {
  NextConfig,
  OptimizedImagesConfig,
  UrlLoaderOptions,
} from '../types'
import { getFileLoaderOptions, getFileLoaderPath } from './file-loader'

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
