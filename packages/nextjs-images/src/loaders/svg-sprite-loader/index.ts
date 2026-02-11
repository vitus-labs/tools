import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DetectedLoaders, OptimizedImagesConfig } from '../../types.js'

const require = createRequire(import.meta.url)
const currentDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Returns the resource query definition for an svg sprite image.
 */
const getSvgSpriteLoaderResourceQuery = (
  optimizedConfig: OptimizedImagesConfig,
  detectedLoaders: DetectedLoaders,
  imgLoaderOptions: Record<string, unknown>,
  optimize: boolean,
) => ({
  resourceQuery: /sprite/,
  use: [
    {
      loader: 'svg-sprite-loader',
      options: {
        runtimeGenerator: require.resolve(
          path.resolve(currentDir, 'svg-runtime-generator.cjs'),
        ),
        ...(optimizedConfig.svgSpriteLoader || {}),
      },
    },
    ...(detectedLoaders.svg && optimize
      ? [
          {
            loader: 'img-loader',
            options: imgLoaderOptions,
          },
        ]
      : []),
  ],
})

export { getSvgSpriteLoaderResourceQuery }
