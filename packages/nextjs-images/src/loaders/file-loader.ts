import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  FileLoaderOptions,
  NextConfig,
  OptimizedImagesConfig,
  WebpackConfig,
} from '../types.js'

const currentFilePath = fileURLToPath(import.meta.url)

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
 * Get the file-loader path.
 */
const getFileLoaderPath = (): string => {
  const absolutePath = path.resolve(
    path.dirname(currentFilePath),
    '..',
    '..',
    'node_modules',
    'file-loader',
    'dist',
    'cjs.js',
  )

  if (fs.existsSync(absolutePath)) {
    return absolutePath
  }

  return 'file-loader'
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
