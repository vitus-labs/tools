import type { Configuration } from 'webpack'
import getConfig from './config'
import {
  appendLoaders,
  detectLoaders,
  getNumOptimizationLoadersInstalled,
} from './loaders/index'
import { showWarning } from './migrater'
import type {
  NextComposePlugins,
  NextConfig,
  OptimizedImagesConfig,
  WebpackOptions,
} from './types'

/**
 * Determine whether images should be optimized in the current build phase.
 */
const shouldOptimizeInCurrentStep = (
  nextComposePlugins: NextComposePlugins,
  dev: boolean,
  optimizeImages: boolean,
  optimizeImagesInDev: boolean,
): boolean => {
  if (nextComposePlugins && typeof nextComposePlugins.phase === 'string') {
    if (nextComposePlugins.phase === 'phase-production-build') {
      return optimizeImages
    }
    if (nextComposePlugins.phase === 'phase-export') {
      return optimizeImages
    }
    if (nextComposePlugins.phase === 'phase-development-server') {
      return optimizeImagesInDev
    }
    return false
  }

  return (!dev && optimizeImages) || (dev && optimizeImagesInDev)
}

/**
 * Check if a webpack sub-rule is a Next.js builtin image rule that should be excluded.
 */
const isBuiltinImageRule = (subRule: Record<string, unknown>): boolean => {
  if (!('issuer' in subRule && subRule.issuer)) return false
  if ('test' in subRule && subRule.test) return false
  if ('include' in subRule && subRule.include) return false
  if (!('exclude' in subRule && subRule.exclude)) return false
  if (!('use' in subRule && subRule.use)) return false
  if (typeof subRule.use !== 'object' || Array.isArray(subRule.use))
    return false

  const use = subRule.use as Record<string, unknown>
  if (!('options' in use && use.options)) return false
  if (typeof use.options !== 'object') return false

  const options = use.options as Record<string, unknown>
  return 'name' in options
}

/**
 * Get the issuer test string from a webpack sub-rule.
 */
const getIssuerTest = (issuer: unknown): string => {
  if (
    typeof issuer === 'object' &&
    issuer !== null &&
    'test' in (issuer as Record<string, unknown>)
  ) {
    return String((issuer as Record<string, unknown>).test)
  }
  return String(issuer)
}

/**
 * If a sub-rule is a Next.js builtin image rule for CSS, exclude image types from it.
 */
const excludeImagesFromBuiltinRule = (subRule: unknown): void => {
  if (!subRule || typeof subRule !== 'object') return

  const sr = subRule as Record<string, unknown>
  if (!isBuiltinImageRule(sr)) return

  const issuerTest = getIssuerTest(sr.issuer)
  const use = sr.use as Record<string, unknown>
  const options = use.options as Record<string, unknown>

  const isCssIssuer = issuerTest === '/\\.(css|scss|sass)$/'
  const isStaticMedia =
    typeof options.name === 'string' && options.name.startsWith('static/media/')

  if (isCssIssuer && isStaticMedia && Array.isArray(sr.exclude)) {
    sr.exclude.push(/\.(jpg|jpeg|png|svg|webp|gif|ico)$/)
  }
}

/**
 * Remove unoptimized builtin image processing introduced in Next.js 9.2.
 */
const removeBuiltinImageProcessing = (config: Configuration): void => {
  if (!config.module?.rules) return

  for (const rule of config.module.rules) {
    if (
      !rule ||
      typeof rule !== 'object' ||
      !('oneOf' in rule) ||
      !rule.oneOf
    ) {
      continue
    }

    for (const subRule of rule.oneOf) {
      excludeImagesFromBuiltinRule(subRule)
    }
  }
}

/**
 * Configure webpack and next.js to handle and optimize images with this plugin.
 */
const withOptimizedImages =
  (optimizedConfig?: Partial<OptimizedImagesConfig>) =>
  (
    nextConfig: NextConfig = {},
    nextComposePlugins: NextComposePlugins = {},
  ) => {
    const { overwriteImageLoaderPaths } = nextConfig
    const { optimizeImages, optimizeImagesInDev } = getConfig(optimizedConfig)

    return {
      ...nextConfig,
      webpack(config: Configuration, options: WebpackOptions): Configuration {
        if (!options.defaultLoaders) {
          throw new Error(
            'This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade',
          )
        }

        const { dev, isServer } = options
        let enrichedConfig = config

        const detectedLoaders = detectLoaders(overwriteImageLoaderPaths)

        const optimizeInCurrentStep = shouldOptimizeInCurrentStep(
          nextComposePlugins,
          dev,
          optimizeImages,
          optimizeImagesInDev,
        )

        if (
          optimizeImages &&
          getNumOptimizationLoadersInstalled(detectedLoaders) === 0 &&
          isServer
        ) {
          showWarning()
        }

        removeBuiltinImageProcessing(enrichedConfig)

        enrichedConfig = appendLoaders(
          enrichedConfig,
          getConfig(optimizedConfig),
          nextConfig,
          detectedLoaders,
          isServer,
          optimizeInCurrentStep,
        )

        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(enrichedConfig, options)
        }

        return enrichedConfig
      },
    }
  }

export default withOptimizedImages
export type {
  DetectedLoaders,
  NextConfig,
  OptimizedImagesConfig,
} from './types'
