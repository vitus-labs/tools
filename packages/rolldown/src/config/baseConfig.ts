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
  extensions: ['.json', '.js', '.jsx', '.ts', '.tsx', '.es6', '.es', '.mjs'],
  include: ['src'],
  external: ['react/jsx-runtime'],
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
