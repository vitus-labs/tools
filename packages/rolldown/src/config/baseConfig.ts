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
  // node:* builtins are external by default — emits an UNRESOLVED_IMPORT
  // warning on every package that imports `node:fs`, `node:path`, etc.
  // without this. expandExternal in tools-core passes RegExp through
  // unchanged, so this composes with the per-package string list.
  external: ['react/jsx-runtime', /^node:/] as (string | RegExp)[],
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
