import { describe, expect, it } from 'vitest'
import config from './baseConfig.js'

describe('baseConfig', () => {
  it('should have correct source and output directories', () => {
    expect(config.sourceDir).toBe('src')
    expect(config.outputDir).toBe('lib')
    expect(config.typesDir).toBe('lib/types')
  })

  it('should have typescript enabled by default', () => {
    expect(config.typescript).toBe(true)
  })

  it('should have replaceGlobals enabled', () => {
    expect(config.replaceGlobals).toBe(true)
  })

  it('should define file extensions', () => {
    expect(config.extensions).toContain('.ts')
    expect(config.extensions).toContain('.tsx')
    expect(config.extensions).toContain('.js')
    expect(config.extensions).toContain('.json')
  })

  it('should have visualise config', () => {
    expect(config.visualise).toEqual({
      template: 'network',
      gzipSize: true,
      outputDir: 'analysis',
    })
  })

  it('should have filesize enabled', () => {
    expect(config.filesize).toBe(true)
  })

  it('should have default globals', () => {
    expect(config.globals).toHaveProperty('react', 'React')
  })

  it('should have external dependencies', () => {
    expect(config.external).toContain('react/jsx-runtime')
  })

  it('should have exclude patterns', () => {
    expect(config.exclude).toContain('node_modules/**')
    expect(config.exclude).toContain('**/__tests__/**')
  })
})
