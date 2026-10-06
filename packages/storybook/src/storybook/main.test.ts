import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('vite-tsconfig-paths', () => ({
  default: vi.fn(() => ({ name: 'mock-tsconfig-paths' })),
}))

vi.mock('../config/index.ts', () => ({
  CONFIG: {
    storiesDir: ['/src/**/*.stories.tsx'],
    framework: 'vite',
    addons: {
      a11y: true,
      chromatic: true,
      docs: true,
      mode: true,
      controls: { expanded: true },
      actions: true,
      toolbars: true,
      measure: true,
      outline: true,
      themes: true,
      vitest: true,
    },
    rocketstories: {
      module: '@vitus-labs/rocketstories',
      export: 'rocketstories',
    },
    port: 6006,
  },
}))

import STORYBOOK_CONFIG from './main.ts'

describe('storybook main config', () => {
  it('should use react-vite framework', () => {
    expect(STORYBOOK_CONFIG.framework).toEqual({
      name: '@storybook/react-vite',
      options: {},
    })
  })

  it('should set stories from CONFIG.storiesDir', () => {
    expect(STORYBOOK_CONFIG.stories).toEqual(['/src/**/*.stories.tsx'])
  })

  it('should map addon keys to storybook addon packages', () => {
    const addons = STORYBOOK_CONFIG.addons as string[]

    expect(addons).toContain('@storybook/addon-a11y')
    expect(addons).toContain('@chromatic-com/storybook')
    expect(addons).toContain('@storybook/addon-docs')
    expect(addons).toContain('@storybook/addon-themes')
    expect(addons).toContain('@storybook/addon-vitest')
  })

  it('should not include unmapped addons', () => {
    const addons = STORYBOOK_CONFIG.addons as string[]

    // 'controls', 'actions', etc. are not in ADDONS_MAP so they should not appear
    expect(addons).not.toContain('controls')
    expect(addons).not.toContain('actions')
  })

  it('should have viteFinal that defines globals', async () => {
    const viteConfig: any = { define: undefined, plugins: [] }

    const result = (await STORYBOOK_CONFIG.viteFinal?.(
      viteConfig,
      {} as any,
    )) as any

    expect(result.define.__BROWSER__).toBe('true')
    expect(result.define.__NATIVE__).toBe('false')
    expect(result.define.__NODE__).toBe('false')
    expect(result.define.__WEB__).toBe('true')
    expect(result.define.__CLIENT__).toBe('true')
    expect(result.define.__VITUS_LABS_STORIES__).toBeDefined()
  })

  it('should add tsconfigPaths and rocketstories plugins in viteFinal', async () => {
    const viteConfig: any = { define: {}, plugins: [] }

    await STORYBOOK_CONFIG.viteFinal?.(viteConfig, {} as any)

    expect(viteConfig.plugins).toHaveLength(2)
    expect(viteConfig.plugins[0]).toHaveProperty('name', 'mock-tsconfig-paths')
    expect(viteConfig.plugins[1]).toHaveProperty(
      'name',
      'vite-plugin-rocketstories',
    )
  })

  it('should add .web.* extensions for vite framework', async () => {
    const viteConfig: any = { define: {}, plugins: [] }

    const result = (await STORYBOOK_CONFIG.viteFinal?.(
      viteConfig,
      {} as any,
    )) as any

    expect(result.resolve.extensions[0]).toBe('.web.tsx')
    expect(result.resolve.extensions[1]).toBe('.web.ts')
    expect(result.resolve.extensions[2]).toBe('.web.jsx')
    expect(result.resolve.extensions[3]).toBe('.web.js')
  })

  it('should handle viteFinal when define already exists', async () => {
    const viteConfig: any = { define: { existing: true }, plugins: [] }

    const result = (await STORYBOOK_CONFIG.viteFinal?.(
      viteConfig,
      {} as any,
    )) as any

    expect(result.define.existing).toBe(true)
    expect(result.define.__BROWSER__).toBe('true')
  })

  it('should delegate standard CSF files to the existing indexers', async () => {
    const csfEntries = [{ type: 'story' }]
    const mockCsfIndexer = {
      test: /\.stories\.[jt]sx?$/,
      createIndex: vi.fn().mockResolvedValue(csfEntries),
    }

    const indexersFn = STORYBOOK_CONFIG.experimental_indexers as (
      existing: any[],
    ) => any[]
    const indexers = indexersFn([mockCsfIndexer])

    // manual indexer first, then the untouched existing indexers
    // (auto-discovery is opt-in and disabled in this config)
    expect(indexers).toHaveLength(2)
    expect(indexers[1]).toBe(mockCsfIndexer)

    // Storybook picks the first matching indexer: it must yield CSF entries
    const file = '/src/Button/__stories__/Button.stories.tsx'
    const first = indexers.find((i) => i.test.test(file))
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockResolvedValueOnce(
      'export default { component: Button }' as any,
    )

    const opts = { makeTitle: (t: string) => t }
    expect(await first.createIndex(file, opts)).toBe(csfEntries)
    expect(mockCsfIndexer.createIndex).toHaveBeenCalledWith(file, opts)
  })

  it('should index rocketstories files without calling the CSF indexer', async () => {
    const mockCsfIndexer = {
      test: /\.stories\.[jt]sx?$/,
      createIndex: vi.fn().mockResolvedValue([{ type: 'story' }]),
    }
    const indexersFn = STORYBOOK_CONFIG.experimental_indexers as (
      existing: any[],
    ) => any[]
    const [manual] = indexersFn([mockCsfIndexer])

    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockResolvedValueOnce(
      'export default stories.init()\nexport const Default = stories.main()' as any,
    )

    const result = await manual.createIndex(
      '/src/Button/__stories__/Button.stories.tsx',
      { makeTitle: (t: string) => t },
    )
    expect(result).toHaveLength(1)
    expect(mockCsfIndexer.createIndex).not.toHaveBeenCalled()
  })

  it('should expose the ui theme to the manager via env', () => {
    const env = STORYBOOK_CONFIG.env as (e: any) => any
    expect(env({ A: '1' })).toEqual({ A: '1', STORYBOOK_VL_UI_THEME: 'dark' })
  })

  it('should add rolldown font mock plugin for next framework', async () => {
    // Re-import with 'next' framework — need to reset modules first
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({ readFile: vi.fn() }))
    vi.doMock('vite-tsconfig-paths', () => ({
      default: vi.fn(() => ({ name: 'mock-tsconfig-paths' })),
    }))
    vi.doMock('../config/index.js', () => ({
      CONFIG: {
        storiesDir: ['/src/**/*.stories.tsx'],
        framework: 'next',
        addons: {},
        rocketstories: {
          module: '@vitus-labs/rocketstories',
          export: 'rocketstories',
        },
        port: 6006,
      },
    }))

    const { default: nextConfig } = await import('./main.js')
    const viteConfig: any = { define: {}, plugins: [] }

    await nextConfig.viteFinal?.(viteConfig, {} as any)

    expect(viteConfig.optimizeDeps.esbuildOptions).toBeUndefined()
    const plugins = viteConfig.optimizeDeps?.rolldownOptions?.plugins ?? []
    expect(plugins).toHaveLength(1)
    expect(plugins[0].name).toBe('storybook-next-font-mock')

    const resolved = plugins[0].resolveId('next/font/local')
    expect(resolved).toContain('next-font-mock')
    expect(plugins[0].resolveId('react')).toBeUndefined()
    expect(plugins[0].resolveId('@next/font/google')).toContain(
      'next-font-mock',
    )

    expect(plugins[0].load(resolved)).toContain('fontMock')
    expect(plugins[0].load('/other.js')).toBeUndefined()
  })

  it('should alias react-native to react-native-web for react-native framework', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({ readFile: vi.fn() }))
    vi.doMock('vite-tsconfig-paths', () => ({
      default: vi.fn(() => ({ name: 'mock-tsconfig-paths' })),
    }))
    vi.doMock('../config/index.js', () => ({
      CONFIG: {
        storiesDir: ['/src/**/*.stories.tsx'],
        framework: 'react-native',
        addons: {},
        rocketstories: {
          module: '@vitus-labs/rocketstories',
          export: 'rocketstories',
        },
        port: 6006,
      },
    }))

    const { default: rnConfig } = await import('./main.js')
    const viteConfig: any = { define: {}, plugins: [] }

    const result = (await rnConfig.viteFinal?.(viteConfig, {} as any)) as any

    // Should alias react-native to react-native-web
    expect(result.resolve.alias['react-native']).toBe('react-native-web')

    // Should add .native.* extensions first (not .web.*)
    expect(result.resolve.extensions[0]).toBe('.native.tsx')
    expect(result.resolve.extensions[1]).toBe('.native.ts')
    expect(result.resolve.extensions[2]).toBe('.native.jsx')
    expect(result.resolve.extensions[3]).toBe('.native.js')

    // Should set __NATIVE__ to true and __WEB__ to false
    expect(result.define.__NATIVE__).toBe('true')
    expect(result.define.__WEB__).toBe('false')

    // Should still use react-vite framework
    expect(rnConfig.framework).toEqual({
      name: '@storybook/react-vite',
      options: {},
    })
  })

  it('should register auto-discovery indexer only when enabled', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({ readFile: vi.fn() }))
    vi.doMock('vite-tsconfig-paths', () => ({ default: vi.fn() }))
    vi.doMock('../config/index.js', () => ({
      CONFIG: {
        storiesDir: [],
        framework: 'vite',
        autoDiscovery: true,
        addons: {},
        rocketstories: { module: 'm', export: 'e' },
        port: 6006,
      },
    }))

    const { default: cfg } = await import('./main.js')
    const fn = cfg.experimental_indexers as (e: any[]) => any[]
    expect(fn([])).toHaveLength(2)
  })
})
