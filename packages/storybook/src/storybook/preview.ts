// @ts-nocheck
/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
import { init } from '@vitus-labs/core'
import * as d from '../decorators'
import CONFIG from '../config/root'

if (__VITUS_LABS_STORIES__.styles === 'styled-components') {
  try {
    const styled = require('styled-components')

    init({
      styled: styled.default,
      css: styled.css,
      context: styled.ThemeProvider,
    })
  } catch (e) {
    // ignore
  }
}

console.log('preview config')
console.log(CONFIG.config)

// if (__VITUS_LABS_STORIES__.styles === 'emotion') {
//   try {
//     const styled = require('@emotion/styled')
//     const helper = require('@emotion/react')
//     const { ThemeProvider } = require('emotion-theming')

//     init({
//       styled: styled.default,
//       css: helper.css,
//       context: ThemeProvider,
//     })
//   } catch (e) {
//     // ignore
//   }
// }

declare global {
  const __VITUS_LABS_STORIES__: Record<string, unknown>
}

declare global {
  interface Window {
    __VITUS_LABS_STORIES__: Record<string, unknown>
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
}, [])

export const parameters = Object.entries(__VITUS_LABS_STORIES__.addons).reduce(
  (acc, [key, value]) => {
    if (typeof value === 'object') {
      return { ...acc, [key]: value }
    }
    return acc
  },
  {}
)
