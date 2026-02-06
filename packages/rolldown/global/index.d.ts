/// <reference types="node" />
export {}

declare global {
  const __BROWSER__: true
  const __WEB__: true
  const __NATIVE__: true
  const __NODE__: true
  const __CLIENT__: true
}

declare global {
  interface Window {
    __BROWSER__: true
    __WEB__: true
    __NATIVE__: true
    __NODE__: true
    __CLIENT__: true
  }
}
