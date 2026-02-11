import type { Configuration, RuleSetRule, RuleSetUseItem } from 'webpack'

export interface OptimizedImagesConfig {
  optimizeImages: boolean
  optimizeImagesInDev: boolean
  handleImages: string[]
  imagesFolder: string
  imagesName: string
  imagesPublicPath?: string
  imagesOutputPath?: string
  removeOriginalExtension: boolean
  inlineImageLimit: number
  defaultImageLoader: string
  mozjpeg: Record<string, unknown>
  optipng: Record<string, unknown>
  pngquant: Record<string, unknown>
  gifsicle: Record<string, unknown>
  svgo: Record<string, unknown>
  svgSpriteLoader: Record<string, unknown>
  webp: Record<string, unknown>
  responsive?: Record<string, unknown> & { adapter?: unknown }
  lqip?: Record<string, unknown>
  imageTrace?: Record<string, unknown>
  [key: string]: unknown
}

export interface DetectedLoaders {
  jpeg: string | false
  gif: string | false
  svg: string | false
  svgSprite: string | false
  webp: string | false
  png: string | false
  lqip: string | false
  responsive: string | false
  responsiveAdapter: string | false
}

export interface HandledImageTypes {
  jpeg: boolean
  png: boolean
  svg: boolean
  webp: boolean
  gif: boolean
  ico: boolean
}

export interface NextConfig {
  assetPrefix?: string
  overwriteImageLoaderPaths?: string
  webpack?: (config: Configuration, options: WebpackOptions) => Configuration
  [key: string]: unknown
}

export interface WebpackOptions {
  defaultLoaders: Record<string, unknown>
  dev: boolean
  isServer: boolean
  [key: string]: unknown
}

export interface NextComposePlugins {
  phase?: string
  [key: string]: unknown
}

export interface FileLoaderOptions {
  publicPath: string
  outputPath: string
  name: string
  [key: string]: unknown
}

export interface UrlLoaderOptions extends FileLoaderOptions {
  limit: number
  fallback: string
}

export interface ResourceQueryConfig {
  test: string
  loaders: string[]
  options?: Record<string, unknown>[]
  optimize: boolean
  combinations?: string[]
}

export interface WebpackRuleUse {
  loader: string
  options?: Record<string, unknown>
}

export type WebpackConfig = Configuration
export type WebpackRule = RuleSetRule
export type WebpackUseItem = RuleSetUseItem
