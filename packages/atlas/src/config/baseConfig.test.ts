import { describe, expect, it } from 'vitest'
import baseConfig from './baseConfig'

describe('atlas baseConfig', () => {
  it('should have default workspaces', () => {
    expect(baseConfig.workspaces).toEqual(['packages/*'])
  })

  it('should include all dep types', () => {
    expect(baseConfig.depTypes).toEqual([
      'dependencies',
      'peerDependencies',
      'devDependencies',
    ])
  })

  it('should output to atlas.html by default', () => {
    expect(baseConfig.outputPath).toBe('./atlas.html')
  })

  it('should auto-open by default', () => {
    expect(baseConfig.open).toBe(true)
  })

  it('should have empty include/exclude by default', () => {
    expect(baseConfig.include).toEqual([])
    expect(baseConfig.exclude).toEqual([])
  })

  it('should generate markdown report by default', () => {
    expect(baseConfig.report).toBe('markdown')
  })

  it('should have a title', () => {
    expect(baseConfig.title).toContain('Atlas')
  })
})
