/* eslint-disable no-undef */
import { MINIMAL_VIEWPORTS, INITIAL_VIEWPORTS } from '@storybook/addon-viewport'
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs'
import { themeDecorator } from '~/decorators'

// @ts-ignore
export const globals = {
  text,
  boolean,
  number,
  withKnobs,
}

// @ts-ignore
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
