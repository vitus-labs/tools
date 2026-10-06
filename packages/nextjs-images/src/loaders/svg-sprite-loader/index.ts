import { fileURLToPath } from 'node:url'
import type { DetectedLoaders, OptimizedImagesConfig } from '../../types.ts'
import { queryParam } from '../query.ts'

const RUNTIME_GENERATOR = fileURLToPath(
  import.meta.resolve('./svg-runtime-generator.js'),
)

/**
 * Returns the resource query definition for an svg sprite image.
 */
const getSvgSpriteLoaderResourceQuery = (
  optimizedConfig: OptimizedImagesConfig,
  detectedLoaders: DetectedLoaders,
  imgLoaderOptions: Record<string, unknown>,
  optimize: boolean,
  imgLoader = 'img-loader',
) => ({
  resourceQuery: queryParam('sprite'),
  use: [
    {
      loader: 'svg-sprite-loader',
      options: {
        runtimeGenerator: RUNTIME_GENERATOR,
        ...(optimizedConfig.svgSpriteLoader || {}),
      },
    },
    ...(detectedLoaders.svg && optimize
      ? [
          {
            loader: imgLoader,
            options: imgLoaderOptions,
          },
        ]
      : []),
  ],
})

export { getSvgSpriteLoaderResourceQuery }
