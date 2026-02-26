# @vitus-labs/tools-nextjs-images

Image optimization loaders for [Next.js](https://nextjs.org) with webpack.

Supports WebP conversion, LQIP (Low Quality Image Placeholders), responsive images, SVG sprites, and image compression via optional optimizers (mozjpeg, optipng, pngquant, gifsicle, svgo).

## Installation

```bash
bun add @vitus-labs/tools-nextjs-images
```

**Peer dependency:** `next >= 14`

### Optional optimizers

Install any combination for automatic image compression:

```bash
bun add -d imagemin-mozjpeg imagemin-optipng imagemin-pngquant imagemin-gifsicle imagemin-svgo webp-loader
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
