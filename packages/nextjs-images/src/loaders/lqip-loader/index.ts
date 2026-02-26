import type { NextConfig, OptimizedImagesConfig } from '../../types'
import { getFileLoaderOptions } from '../file-loader'

/**
 * Build options for the webpack lqip loader.
 */
const getLqipLoaderOptions = (
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
): Record<string, unknown> => ({
  ...getFileLoaderOptions(optimizedConfig, nextConfig, isServer),
  ...(optimizedConfig.lqip || {}),
})

export { getLqipLoaderOptions }
