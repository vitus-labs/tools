module.exports = {
  sourceDir: 'src',
  typescript: true,
  visualise: {
    template: 'network',
    gzipSize: true,
  },
  filesize: true,
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.es6', '.es', '.mjs'],
  exclude: [
    '*.d.ts',
    'node_modules/**',
    '__tests__',
    '__specs__',
    '__stories__',
    '*.test.*',
    '*.spec.*',
    '*.stories.*',
    '*.story.*',
  ],
  globals: {
    react: 'React',
    ReactDOM: 'react-dom',
    styled: 'styled-components',
  },
}
