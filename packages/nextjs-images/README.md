# @vitus-labs/tools-nextjs-images

Image optimization loaders for [Next.js](https://nextjs.org) with webpack.

Supports WebP conversion, LQIP (Low Quality Image Placeholders), responsive images, SVG sprites, and image compression via optional optimizers (mozjpeg, optipng, pngquant, gifsicle, svgo).

## Installation

```bash
bun add @vitus-labs/tools-nextjs-images
```

**Peer dependency:** `next >= 14`, **Node:** `>= 22.12` (imagemin plugins are ESM-only and loaded synchronously via `require(esm)`)

### Webpack only (Turbopack is not supported)

Next.js 16 uses **Turbopack by default** for `next dev` and `next build`. Turbopack ignores the `webpack` config function this plugin relies on, so images would be silently left unprocessed. Run Next with webpack:

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack"
  }
}
```

If Turbopack is detected (`TURBOPACK` is set by Next.js), the plugin prints a one-time warning.

### Optional packages

Install the packages for the features you use, in your own project (they are detected from your project, or from `overwriteImageLoaderPaths`):

| Feature | Packages |
|---|---|
| Compression of JPEG / PNG / GIF / SVG | `imagemin-mozjpeg`, `imagemin-optipng` or `imagemin-pngquant`, `imagemin-gifsicle`, `imagemin-svgo` |
| `?webp` and `.webp` optimization | `webp-loader` |
| `?lqip`, `?lqip-colors` | `lqip-loader` |
| `?resize`, `?size`, `?sizes[]` | `responsive-loader` and `sharp` (or `jimp`) |
| `?sprite` | `svg-sprite-loader` |
| `?trace` | `image-trace-loader` |

```bash
bun add -d imagemin-mozjpeg imagemin-optipng imagemin-pngquant imagemin-gifsicle imagemin-svgo webp-loader
bun add -d lqip-loader responsive-loader sharp svg-sprite-loader image-trace-loader
```

## Usage

Wrap your Next.js config:

```ts
// next.config.ts
import withOptimizedImages from '@vitus-labs/tools-nextjs-images'

export default withOptimizedImages()({
  // standard next.config.ts options
})
```

Or with custom options:

```ts
export default withOptimizedImages({
  optimizeImagesInDev: true,
  handleImages: ['jpeg', 'png', 'webp', 'svg'],
  inlineImageLimit: 16384,
})({})
```

## Configuration

| Option | Default | Description |
|---|---|---|
| `optimizeImages` | `true` | Enable image optimization in production |
| `optimizeImagesInDev` | `false` | Enable image optimization in development |
| `handleImages` | `['jpeg', 'png', 'svg', 'webp', 'gif']` | Image formats to process |
| `imagesFolder` | `'images'` | Output folder name |
| `imagesName` | `'[name]-[hash].[ext]'` | Output filename pattern |
| `removeOriginalExtension` | `false` | Remove original extension when converting (e.g. `.jpg` before `.webp`) |
| `inlineImageLimit` | `8192` | Inline images smaller than this (bytes) as data URIs |
| `defaultImageLoader` | `'img-loader'` | Default image optimization loader |

### Optimizer options

Each optimizer can be configured with its own options object:

| Option | Description |
|---|---|
| `mozjpeg` | [mozjpeg](https://github.com/imagemin/imagemin-mozjpeg) options |
| `optipng` | [optipng](https://github.com/imagemin/imagemin-optipng) options |
| `pngquant` | [pngquant](https://github.com/imagemin/imagemin-pngquant) options |
| `gifsicle` | [gifsicle](https://github.com/imagemin/imagemin-gifsicle) options |
| `svgo` | [svgo](https://github.com/svg/svgo) options |
| `webp` | [webp-loader](https://github.com/nwtn/webp-loader) options |
| `svgSpriteLoader` | [svg-sprite-loader](https://github.com/JetBrains/svg-sprite-loader) options |

## Resource queries

Import images with query parameters to control processing:

```ts
// Convert to WebP
import image from './photo.jpg?webp'

// Get responsive image set
import image from './photo.jpg?resize&sizes[]=300&sizes[]=600&sizes[]=1200'

// Get LQIP (Low Quality Image Placeholder)
import { src, preSrc } from './photo.jpg?lqip'

// Inline as SVG sprite
import icon from './icon.svg?sprite'

// Get raw file URL
import url from './photo.jpg?url'
```

## Exports

| Export | Description |
|---|---|
| `default` (`withOptimizedImages`) | Next.js plugin factory |
| `OptimizedImagesConfig` | TypeScript type for config options |
| `DetectedLoaders` | TypeScript type for detected loader map |
| `NextConfig` | TypeScript type for Next.js config |

## License

MIT
