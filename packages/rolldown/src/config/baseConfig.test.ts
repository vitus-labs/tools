import { describe, expect, it } from 'vitest'
import baseConfig from './baseConfig'

describe('baseConfig', () => {
  it('should have correct directory settings', () => {
    expect(baseConfig.sourceDir).toBe('src')
    expect(baseConfig.outputDir).toBe('lib')
    expect(baseConfig.typesDir).toBe('lib/types')
  })

  it('should have typescript enabled', () => {
    expect(baseConfig.typescript).toBe(true)
  })

  it('should include all expected file extensions', () => {
    const expectedExtensions = [
      '.json',
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.es6',
      '.es',
      '.mjs',
    ]
    expect(baseConfig.extensions).toEqual(expectedExtensions)
  })

  it('should exclude test patterns', () => {
    expect(baseConfig.exclude).toContain('**/__tests__/**')
    expect(baseConfig.exclude).toContain('**/__specs__/**')
    expect(baseConfig.exclude).toContain('**/__stories__/**')
    expect(baseConfig.exclude).toContain('*.test.*')
    expect(baseConfig.exclude).toContain('*.spec.*')
    expect(baseConfig.exclude).toContain('*.stories.*')
    expect(baseConfig.exclude).toContain('*.story.*')
  })

  it('should define globals for react, ReactDOM, and styled', () => {
    expect(baseConfig.globals).toEqual({
      react: 'React',
      ReactDOM: 'react-dom',
      styled: 'styled-components',
    })
  })

  it('should include react/jsx-runtime as external', () => {
    expect(baseConfig.external).toContain('react/jsx-runtime')
  })
})
