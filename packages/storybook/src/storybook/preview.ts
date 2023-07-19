import * as d from '../decorators/index.js'

type VLStories = {
  globals: any
  decorators: any
  addons: any
} & Record<string, any>

declare global {
  const __VITUS_LABS_STORIES__: VLStories
}

declare global {
  interface Window {
    __VITUS_LABS_STORIES__: VLStories
  }
}

// define configuration globally in window so it can be accessible from anywhere in the browser
window.__VITUS_LABS_STORIES__ = __VITUS_LABS_STORIES__

export const globalTypes = __VITUS_LABS_STORIES__.globals

export const decorators = Object.entries(
  __VITUS_LABS_STORIES__.decorators
).reduce((acc, [key, value]) => {
  if (value) {
    acc.push(d[key](value))
  }
  return acc
}, [] as any)

export const parameters = Object.entries(__VITUS_LABS_STORIES__.addons).reduce(
  (acc, [key, value]) => {
    if (typeof value === 'object') {
      return { ...acc, [key]: value }
    }
    return acc
  },
  {}
)
