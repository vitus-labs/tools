import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('vite-tsconfig-paths', () => ({
  default: vi.fn(() => ({ name: 'mock-tsconfig-paths' })),
}))

vi.mock('../config/index.js', () => ({
  CONFIG: {
    storiesDir: ['/src/**/*.stories.tsx'],
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
    port: 6006,
  },
}))

import STORYBOOK_CONFIG from './main.js'

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
    expect(result.define.__NODE__).toBe('true')
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

  it('should handle viteFinal when define already exists', async () => {
    const viteConfig: any = { define: { existing: true }, plugins: [] }

    const result = (await STORYBOOK_CONFIG.viteFinal?.(
      viteConfig,
      {} as any,
    )) as any

    expect(result.define.existing).toBe(true)
    expect(result.define.__BROWSER__).toBe('true')
  })

  it('should wrap existing indexers to skip rocketstories files', async () => {
    const mockCsfIndexer = {
      test: /\.stories\.[jt]sx?$/,
      createIndex: vi.fn().mockResolvedValue([{ type: 'story' }]),
    }

    const indexersFn = STORYBOOK_CONFIG.experimental_indexers as (
      existing: any[],
    ) => any[]
    const indexers = indexersFn([mockCsfIndexer])

    // Should have: manualStoryIndexer, autoDiscoveryIndexer, wrapped CSF
    expect(indexers).toHaveLength(3)

    // The wrapped CSF indexer should skip rocketstories files
    const wrappedCsf = indexers[2]
    const rocketstoriesFile = '/src/Button/__stories__/Button.stories.tsx'

    // Mock readFile to return rocketstories content
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockResolvedValueOnce(
      'export default stories.init()' as any,
    )

    const result = await wrappedCsf.createIndex(rocketstoriesFile, {})
    expect(result).toEqual([])
    expect(mockCsfIndexer.createIndex).not.toHaveBeenCalled()
  })

  it('should let wrapped indexers handle standard CSF files', async () => {
    const mockCsfIndexer = {
      test: /\.stories\.[jt]sx?$/,
      createIndex: vi.fn().mockResolvedValue([{ type: 'story' }]),
    }

    const indexersFn = STORYBOOK_CONFIG.experimental_indexers as (
      existing: any[],
    ) => any[]
    const indexers = indexersFn([mockCsfIndexer])
    const wrappedCsf = indexers[2]

    const csfFile = '/src/Button/__stories__/Button.stories.tsx'
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockResolvedValueOnce(
      'export default { component: Button }' as any,
    )

    const result = await wrappedCsf.createIndex(csfFile, {
      makeTitle: (t: string) => t,
    })
    expect(result).toEqual([{ type: 'story' }])
    expect(mockCsfIndexer.createIndex).toHaveBeenCalledWith(csfFile, {
      makeTitle: expect.any(Function),
    })
  })
})
