import { describe, expect, it } from 'vitest'
import baseConfig from './baseConfig'

describe('nextjs baseConfig', () => {
  it('should enable security headers by default', () => {
    expect(baseConfig.headers).toBe(true)
  })

  it('should have empty images config by default', () => {
    expect(baseConfig.images).toEqual({})
  })

  it('should have empty transpilePackages by default', () => {
    expect(baseConfig.transpilePackages).toEqual([])
  })

  it('should not ignore TypeScript build errors', () => {
    expect(baseConfig.typescript.ignoreBuildErrors).toBe(false)
  })
})
