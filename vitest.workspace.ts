import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/core',
  'packages/rolldown',
  'packages/rollup',
  'packages/favicon',
  'packages/storybook',
  'packages/lint',
  'packages/typescript',
  'packages/nextjs',
  'packages/nextjs-images',
])
