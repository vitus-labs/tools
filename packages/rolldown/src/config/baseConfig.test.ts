import { describe, expect, it } from 'vitest'
import baseConfig from './baseConfig.ts'

describe('baseConfig', () => {
  it('should have correct directory settings', () => {
    expect(baseConfig.sourceDir).toBe('src')
    expect(baseConfig.outputDir).toBe('lib')
    expect(baseConfig).not.toHaveProperty('typesDir')
  })

  it('should have typescript enabled', () => {
    expect(baseConfig.typescript).toBe(true)
  })

  it('should default sourcemap to true (backward-compatible)', () => {
    expect(baseConfig.sourcemap).toBe(true)
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

  it('should not expose options the build never reads', () => {
    for (const key of ['esModulesOnly', 'include', 'exclude', 'typesDir']) {
      expect(baseConfig).not.toHaveProperty(key)
    }
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

  it('should have safe defaults for advanced build options', () => {
    expect(baseConfig.entries).toBeUndefined()
    expect(baseConfig.bundleAll).toBe(false)
    expect(baseConfig.copyFiles).toBeUndefined()
    expect(baseConfig.banner).toBeUndefined()
    expect(baseConfig.footer).toBeUndefined()
    expect(baseConfig.alias).toBeUndefined()
    expect(baseConfig.plugins).toEqual([])
  })
})
