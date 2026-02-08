import { createVitestConfig } from '../../vitest.shared.js'

export default createVitestConfig([
  'src/storybook/manager.ts',
  'src/storybook/preview.ts',
  'src/decorators/**',
])
