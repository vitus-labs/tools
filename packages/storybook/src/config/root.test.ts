import { beforeEach, describe, expect, it } from 'vitest'
import { INTERNAL_CONFIG, internalConfig, setConfig } from './root.js'

describe('config/root', () => {
  beforeEach(() => {
    setConfig({})
  })

  it('should initialize with empty config', () => {
    expect(INTERNAL_CONFIG.CONFIG).toEqual({})
  })

  it('should update config via setConfig', () => {
    setConfig({ port: 6006, outDir: '/docs' })

    expect(INTERNAL_CONFIG.CONFIG).toEqual({ port: 6006, outDir: '/docs' })
  })

  it('should expose config through internalConfig getter', () => {
    setConfig({ theme: 'dark' })

    expect(internalConfig.config).toEqual({ theme: 'dark' })
  })

  it('should reflect updates through internalConfig getter', () => {
    setConfig({ a: 1 })
    expect(internalConfig.config).toEqual({ a: 1 })

    setConfig({ b: 2 })
    expect(internalConfig.config).toEqual({ b: 2 })
  })
})
