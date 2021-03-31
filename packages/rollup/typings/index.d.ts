/* eslint-disable no-underscore-dangle */
/// <reference types="node" />
export {}

declare global {
  const __BROWSER__: true
  const __WEB__: true
  const __NATIVE__: true
  const __SERVER__: true
  const __CLIENT__: true
}

declare global {
  interface Window {
    __BROWSER__: true
    __WEB__: true
    __NATIVE__: true
    __SERVER__: true
    __CLIENT__: true
  }
}
