import { afterEach, describe, expect, it, vi } from 'vitest'

const mockConfig = (overrides: Record<string, unknown> = {}) => {
  vi.doMock('@vitus-labs/tools-core', () => ({
    TS_CONFIG: {},
    VL_CONFIG: () => ({
      merge: (base: Record<string, unknown>) => ({
        config: { ...base, ...overrides },
      }),
    }),
  }))
  vi.doMock('./baseConfig.ts', () => ({
    default: {
      outDir: '/docs',
      storiesDir: ['/src/**/*.stories.tsx'],
      monorepoStoriesDir: ['/packages/*/src/**/*.stories.tsx'],
      autoDiscovery: false,
      autoDiscoveryDir: ['/src/**/index.tsx'],
      monorepoAutoDiscoveryDir: ['/packages/*/src/**/index.tsx'],
    },
  }))
}

describe('CONFIG', () => {
  afterEach(() => {
    delete process.env.VL_MONOREPO
    vi.resetModules()
    vi.doUnmock('@vitus-labs/tools-core')
    vi.doUnmock('./baseConfig.ts')
  })

  it('only matches story files by default', async () => {
    mockConfig()
    const { CONFIG } = await import('./index.ts')
    expect(CONFIG.storiesDir).toEqual([`${process.cwd()}/src/**/*.stories.tsx`])
  })

  it('adds index globs when autoDiscovery is enabled', async () => {
    mockConfig({ autoDiscovery: true })
    const { CONFIG } = await import('./index.ts')
    expect(CONFIG.storiesDir).toEqual([
      `${process.cwd()}/src/**/*.stories.tsx`,
      `${process.cwd()}/src/**/index.tsx`,
    ])
  })

  it('uses monorepo globs when VL_MONOREPO=1', async () => {
    process.env.VL_MONOREPO = '1'
    mockConfig({ autoDiscovery: true })
    const { CONFIG } = await import('./index.ts')
    expect(CONFIG.storiesDir).toEqual([
      `${process.cwd()}/packages/*/src/**/*.stories.tsx`,
      `${process.cwd()}/packages/*/src/**/index.tsx`,
    ])
  })
})
