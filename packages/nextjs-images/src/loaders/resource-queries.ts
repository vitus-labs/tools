import { fileURLToPath } from 'node:url'
import type {
  DetectedLoaders,
  NextConfig,
  OptimizedImagesConfig,
  ResourceQueryConfig,
} from '../types'
import { getFileLoaderOptions, getFileLoaderPath } from './file-loader'
import { getImageTraceLoaderOptions } from './image-trace-loader'
import { getLqipLoaderOptions } from './lqip-loader/index'
import { getResponsiveLoaderOptions } from './responsive-loader'
import { getUrlLoaderOptions } from './url-loader'

const LQIP_EXPORT_LOADER = fileURLToPath(
  import.meta.resolve('./lqip-export-loader.js'),
)

/**
 * Configure the common resource queries.
 */
const queries: ResourceQueryConfig[] = [
  // ?url: force a file url/reference, never use inlining
  {
    test: 'url',
    loaders: [getFileLoaderPath()],
    optimize: true,
    combinations: ['original'],
  },

  // ?inline: force inlining an image regardless of the defined limit
  {
    test: 'inline',
    loaders: ['url-loader'],
    options: [{ limit: undefined }],
    optimize: true,
    combinations: ['original'],
  },

  // ?include: include the image directly, no data uri or external file
  {
    test: 'include',
    loaders: ['raw-loader'],
    optimize: true,
    combinations: ['original'],
  },

  // ?original: use the original image and don't optimize it
  {
    test: 'original',
    loaders: ['url-loader'],
    optimize: false,
  },

  // ?lqip: low quality image placeholder
  {
    test: 'lqip(&|$)',
    loaders: [LQIP_EXPORT_LOADER, 'lqip-loader', 'url-loader'],
    options: [{ exportProperty: 'preSrc' }],
    optimize: false,
  },

  // ?lqip-colors: low quality image placeholder colors
  {
    test: 'lqip-colors',
    loaders: [LQIP_EXPORT_LOADER, 'lqip-loader', 'url-loader'],
    options: [{ exportProperty: 'palette' }, { base64: false, palette: true }],
    optimize: false,
  },

  // ?resize: resize images
  {
    test: 'size',
    loaders: ['responsive-loader'],
    optimize: false,
  },

  // ?trace: generate svg image traces for placeholders
  {
    test: 'trace',
    loaders: ['image-trace-loader', 'url-loader'],
    optimize: true,
    combinations: ['original'],
  },
]

// Add combination queries (e.g. ?url&original, ?original&url)
const baseCopy = [...queries]
for (const queryConfig of baseCopy) {
  if (queryConfig.combinations) {
    for (const combination of queryConfig.combinations) {
      if (combination === 'original') {
        queries.unshift({
          ...queryConfig,
          test: `(${queryConfig.test}.*original|original.*${queryConfig.test})`,
          optimize: false,
        })
      }
    }
  }
}

/**
 * Returns all common resource queries for the given optimization loader.
 */
const getResourceQueries = (
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
  optimizerLoaderName: string | null,
  optimizerLoaderOptions: unknown,
  detectedLoaders: DetectedLoaders,
) => {
  const loaderOptions: Record<string, Record<string, unknown>> = {
    'url-loader': getUrlLoaderOptions(optimizedConfig, nextConfig, isServer),
    'file-loader': getFileLoaderOptions(optimizedConfig, nextConfig, isServer),
    [getFileLoaderPath()]: getFileLoaderOptions(
      optimizedConfig,
      nextConfig,
      isServer,
    ),
    'lqip-loader': getLqipLoaderOptions(optimizedConfig, nextConfig, isServer),
    'responsive-loader': getResponsiveLoaderOptions(
      optimizedConfig,
      nextConfig,
      isServer,
      detectedLoaders,
    ),
    'image-trace-loader': getImageTraceLoaderOptions(optimizedConfig),
  }

  return queries.map((queryConfig) => {
    const loaders: Array<{
      loader: string
      options?: Record<string, unknown>
    }> = []

    queryConfig.loaders.forEach((loader, index) => {
      const loaderConfig: {
        loader: string
        options?: Record<string, unknown>
      } = {
        loader,
      }

      if (loaderOptions[loader]) {
        loaderConfig.options = loaderOptions[loader]
      }

      if (queryConfig.options) {
        loaderConfig.options = {
          ...(loaderConfig.options || {}),
          ...(queryConfig.options[index] || {}),
        }
      }

      loaders.push(loaderConfig)
    })

    return {
      resourceQuery: new RegExp(queryConfig.test),
      use: loaders.concat(
        queryConfig.optimize && optimizerLoaderName !== null
          ? [
              {
                loader: optimizerLoaderName,
                options: optimizerLoaderOptions as Record<string, unknown>,
              },
            ]
          : [],
      ),
    }
  })
}

export { getResourceQueries }
