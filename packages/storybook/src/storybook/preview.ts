import type { Preview } from '@storybook/react'

declare const __VITUS_LABS_STORIES__: {
  globals: any
  addons: Record<string, any>
}

const parameters = Object.entries(__VITUS_LABS_STORIES__.addons).reduce(
  (acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      return { ...acc, [key]: value }
    }
    return acc
  },
  {},
)

const preview: Preview = {
  tags: ['autodocs'],
  parameters,
  initialGlobals: __VITUS_LABS_STORIES__.globals,
}

export default preview
