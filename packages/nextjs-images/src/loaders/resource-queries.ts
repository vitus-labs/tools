import { fileURLToPath } from 'node:url'
import type {
  DetectedLoaders,
  NextConfig,
  OptimizedImagesConfig,
  ResourceQueryConfig,
} from '../types.ts'
import { getFileLoaderOptions, getFileLoaderPath } from './file-loader.ts'
import { getImageTraceLoaderOptions } from './image-trace-loader.ts'
import { getLqipLoaderOptions } from './lqip-loader/index.ts'
import { allParamsSource, paramSource } from './query.ts'
import { resolveOwnLoader } from './resolve.ts'
import { getResponsiveLoaderOptions } from './responsive-loader.ts'
import { getUrlLoaderOptions } from './url-loader.ts'

const LQIP_EXPORT_LOADER = fileURLToPath(
  import.meta.resolve('./lqip-export-loader.js'),
)

// Own dependencies are resolved to absolute paths: webpack would otherwise
// look them up from the user's project, which fails with isolated installs.
const URL_LOADER = resolveOwnLoader('url-loader')
const RAW_LOADER = resolveOwnLoader('raw-loader')

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
    loaders: [URL_LOADER],
    options: [{ limit: undefined }],
    optimize: true,
    combinations: ['original'],
  },

  // ?include: include the image directly, no data uri or external file
  {
    test: 'include',
    loaders: [RAW_LOADER],
    optimize: true,
    combinations: ['original'],
  },

  // ?original: use the original image and don't optimize it
  {
    test: 'original',
    loaders: [URL_LOADER],
    optimize: false,
  },

  // ?lqip: low quality image placeholder
  {
    test: 'lqip',
    loaders: [LQIP_EXPORT_LOADER, 'lqip-loader', URL_LOADER],
    options: [{ exportProperty: 'preSrc' }],
    optimize: false,
  },

  // ?lqip-colors: low quality image placeholder colors
  {
    test: 'lqip-colors',
    loaders: [LQIP_EXPORT_LOADER, 'lqip-loader', URL_LOADER],
    options: [{ exportProperty: 'palette' }, { base64: false, palette: true }],
    optimize: false,
  },

  // ?resize: resize images
  {
    test: '(?:resize|sizes?)',
    loaders: ['responsive-loader'],
    optimize: false,
  },

  // ?trace: generate svg image traces for placeholders
  {
    test: 'trace',
    loaders: ['image-trace-loader', URL_LOADER],
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
          requires: [queryConfig.test, 'original'],
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
    [URL_LOADER]: getUrlLoaderOptions(optimizedConfig, nextConfig, isServer),
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
      resourceQuery: new RegExp(
        queryConfig.requires
          ? allParamsSource(queryConfig.requires)
          : paramSource(queryConfig.test),
      ),
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
