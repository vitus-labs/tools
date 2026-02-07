import { describe, expect, it, vi } from 'vitest'

vi.mock('@vitus-labs/tools-core', () => ({
  VL_CONFIG: (key: string) => ({
    config: { key },
    get: (param: string, defaultValue?: any) => defaultValue || {},
    merge: (param: Record<string, any>) => ({
      config: { key, ...param },
    }),
  }),
  TS_CONFIG: { compilerOptions: { strict: true } },
}))

import { VL_CONFIG, TS_CONFIG } from './initialConfig.js'

describe('initialConfig', () => {
  it('should export VL_CONFIG derived from tools-core', () => {
    expect(VL_CONFIG).toBeDefined()
    expect(VL_CONFIG.config).toHaveProperty('key', 'stories')
  })

  it('should export TS_CONFIG from tools-core', () => {
    expect(TS_CONFIG).toEqual({ compilerOptions: { strict: true } })
  })

  it('should support merge on VL_CONFIG', () => {
    const merged = VL_CONFIG.merge({ port: 3000 })
    expect(merged.config).toHaveProperty('port', 3000)
  })
})
