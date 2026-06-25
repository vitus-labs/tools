export default {
  sourceDir: 'src',
  outputDir: 'lib',
  typesDir: 'lib/types',
  typescript: true,
  esModulesOnly: false,
  replaceGlobals: true,
  visualise: {
    template: 'network',
    gzipSize: true,
    outputDir: 'analysis',
  },
  filesize: true,
  // JS-bundle sourcemap. Mirrors rolldown's native output.sourcemap:
  //   true     — separate .js.map file + sourceMappingURL comment (default)
  //   'hidden' — separate .js.map file, NO comment (debugging without leak)
  //   'inline' — base64 map embedded in the .js file
  //   false    — no map emitted
  // DTS output does not include sourcemaps (declarations don't need them).
  sourcemap: true as boolean | 'inline' | 'hidden',
  extensions: ['.json', '.js', '.jsx', '.ts', '.tsx', '.es6', '.es', '.mjs'],
  include: ['src'],
  // User-overridable default externals. node:* builtins are NOT here —
  // they live in ALWAYS_EXTERNAL (rolldown/config.ts) so a per-package
  // `external` override can't drop them. This list IS replaced wholesale
  // when a package sets its own `external` in vl-tools.config.mjs.
  external: ['react/jsx-runtime'] as (string | RegExp)[],
  exclude: [
    'lib',
    'node_modules/**',
    '**/__tests__/**',
    '**/__specs__/**',
    '**/__stories__/**',
    '*.test.*',
    '*.spec.*',
    '*.stories.*',
    'stories.*',
    '*.story.*',
  ],
  globals: {
    react: 'React',
    ReactDOM: 'react-dom',
    styled: 'styled-components',
  },

  // Advanced build options
  entries: undefined as
    | {
        input: string
        file: string
        format?: string
        env?: string
        platform?: string
      }[]
    | undefined,
  bundleAll: false,
  copyFiles: undefined as { from: string; to: string }[] | undefined,
  banner: undefined as string | undefined,
  footer: undefined as string | undefined,
  alias: undefined as Record<string, string> | undefined,
  plugins: [] as unknown[],
}
