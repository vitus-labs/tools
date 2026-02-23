import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  FileLoaderOptions,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.js'

/**
 * Build options for the webpack file loader.
 */
const getFileLoaderOptions = (
  {
    imagesPublicPath,
    imagesOutputPath,
    imagesFolder,
    imagesName,
  }: Pick<
    OptimizedImagesConfig,
    'imagesPublicPath' | 'imagesOutputPath' | 'imagesFolder' | 'imagesName'
  >,
  { assetPrefix }: NextConfig,
  isServer: boolean,
): FileLoaderOptions => {
  let publicPath = `/_next/static/${imagesFolder}/`

  if (imagesPublicPath) {
    publicPath = imagesPublicPath
  } else if (assetPrefix) {
    publicPath = `${assetPrefix}${
      assetPrefix.endsWith('/') ? '' : '/'
    }_next/static/${imagesFolder}/`
  }

  return {
    publicPath,
    outputPath:
      imagesOutputPath || `${isServer ? '../' : ''}static/${imagesFolder}/`,
    name: imagesName,
  }
}

/**
 * Get the file-loader path. Resolves to an absolute path so webpack can find
 * it even when file-loader is a transitive dependency of this package.
 */
const getFileLoaderPath = (): string => {
  try {
    const resolved = fileURLToPath(import.meta.resolve('file-loader'))
    // Prefer the CJS entry point for webpack compatibility
    const cjsPath = path.join(path.dirname(resolved), 'cjs.js')
    if (existsSync(cjsPath)) return cjsPath
    return resolved
  } catch {
    return 'file-loader'
  }
}

/**
 * Apply the file loader to the webpack configuration.
 */
const applyFileLoader = (
  webpackConfig: WebpackConfig,
  optimizedConfig: OptimizedImagesConfig,
  nextConfig: NextConfig,
  isServer: boolean,
  fileRegex: RegExp,
): WebpackConfig => {
  webpackConfig.module?.rules?.push({
    test: fileRegex,
    oneOf: [
      {
        use: {
          loader: getFileLoaderPath(),
          options: getFileLoaderOptions(optimizedConfig, nextConfig, isServer),
        },
      },
    ],
  })

  return webpackConfig
}

export { getFileLoaderOptions, getFileLoaderPath, applyFileLoader }
