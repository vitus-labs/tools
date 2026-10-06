import type { Preview } from '@storybook/react'

declare const __VITUS_LABS_STORIES__: {
  globals: Record<string, any>
  addons: Record<string, any>
  framework: string
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

// Storybook 10 no longer reads `parameters.backgrounds.default` — the active
// background is a global. Map the configured default onto it (explicit
// `globals.backgrounds` still wins).
const defaultBackground = __VITUS_LABS_STORIES__.addons.backgrounds?.default

const initialGlobals = {
  ...(defaultBackground && { backgrounds: { value: defaultBackground } }),
  ...__VITUS_LABS_STORIES__.globals,
}

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    ...parameters,
    ...(__VITUS_LABS_STORIES__.framework === 'next' && {
      nextjs: { appDirectory: true },
    }),
  },
  initialGlobals,
}

export default preview
