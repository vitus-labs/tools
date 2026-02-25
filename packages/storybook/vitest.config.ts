import { createVitestConfig } from '@vitus-labs/tools-vitest'

export default createVitestConfig([
  'src/storybook/manager.ts',
  'src/storybook/preview.ts',
])
