import type { OptimizedImagesConfig } from '../types.js'

/**
 * Build options for the webpack image trace loader.
 */
const getImageTraceLoaderOptions = ({
  imageTrace,
}: Pick<OptimizedImagesConfig, 'imageTrace'>): Record<string, unknown> => ({
  ...(imageTrace || {}),
})

export { getImageTraceLoaderOptions }
