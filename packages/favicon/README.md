# @vitus-labs/tools-favicon

CLI tool for generating multi-platform favicons from a source image.

Powered by [favicons](https://github.com/itgalaxy/favicons).

## Installation

```bash
bun add -d @vitus-labs/tools-favicon
```

## Usage

Add to your `package.json`:

```json
{
  "scripts": {
    "favicon": "vl_favicon"
  }
}
```

## Configuration

Configure via `vl-tools.config.mjs` (key: `favicon`):

```js
export default {
  favicon: {
    background: '#fff',
    theme_color: '#fff',
    icons: [
      {
        input: 'src/assets/logo.png',
        output: 'public/icons',
        path: '/icons',
      },
    ],
  },
}
```

### Options

| Option | Default | Description |
|---|---|---|
| `background` | `#fff` | Background color for icons |
| `theme_color` | `#fff` | Theme color for manifests |
| `display` | `standalone` | PWA display mode |
| `orientation` | `any` | Screen orientation |
| `lang` | `en-US` | Language tag |
| `start_url` | `/?homescreen=1` | PWA start URL |
| `icons` | — | Array of `{ input, output, path }` entries |

### Generated platforms

Android, Apple icon, Apple startup, Coast, Favicons, Firefox, Windows, Yandex.

## Programmatic API

```ts
import { generateFavicons } from '@vitus-labs/tools-favicon'

await generateFavicons()
```

## License

MIT
