import type { OptimizedImagesConfig } from './types'

/**
 * Enriches the next-optimized-images configuration object with default config values
 * and returns it.
 */
const getConfig = (
  optimizedConfig?: Partial<OptimizedImagesConfig>,
): OptimizedImagesConfig => ({
  optimizeImages: true,
  optimizeImagesInDev: false,
  handleImages: ['jpeg', 'png', 'svg', 'webp', 'gif'],
  imagesFolder: 'images',
  imagesName: '[name]-[hash].[ext]',
  removeOriginalExtension: false,
  inlineImageLimit: 8192,
  defaultImageLoader: 'img-loader',
  mozjpeg: {},
  optipng: {},
  pngquant: {},
  gifsicle: {
    interlaced: true,
    optimizationLevel: 3,
  },
  svgo: {
    plugins: [{ name: 'removeViewBox', active: false }],
  },
  svgSpriteLoader: {
    symbolId: '[name]-[hash:8]',
  },
  webp: {},
  ...optimizedConfig,
})

export default getConfig
