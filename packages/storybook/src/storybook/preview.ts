/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
import { MINIMAL_VIEWPORTS, INITIAL_VIEWPORTS } from '@storybook/addon-viewport'
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs'
import { themeDecorator } from '../decorators'

declare global {
  const __VITUS_LABS_STORIES__: Record<string, unknown>
}

declare global {
  interface Window {
    __VITUS_LABS_STORIES__: Record<string, unknown>
    __STORY__: {
      text: typeof text
      boolean: typeof boolean
      number: typeof number
      withKnobs: typeof withKnobs
    }
  }
}

// define configuration globally in window so it can be accessible from anywhere in the browser
window.__VITUS_LABS_STORIES__ = __VITUS_LABS_STORIES__
window.__STORY__ = {
  text,
  boolean,
  number,
  withKnobs,
}

export const decorators = [themeDecorator(__VITUS_LABS_STORIES__.theme)]

export const parameters = {
  viewport: {
    viewports: { ...MINIMAL_VIEWPORTS, ...INITIAL_VIEWPORTS },
  },
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#fff' },
      { name: 'dark', value: '#000' },
    ],
    grid: {
      disable: false,
      cellSize: 8,
      opacity: 0.5,
      cellAmount: 4,
      offsetX: 16,
      offsetY: 16,
    },
  },
}
