import { describe, expect, it, vi } from 'vitest'

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

    const result = await STORYBOOK_CONFIG.viteFinal!(viteConfig, {} as any)

    expect(result.define.__BROWSER__).toBe('true')
    expect(result.define.__NATIVE__).toBe('false')
    expect(result.define.__NODE__).toBe('true')
    expect(result.define.__WEB__).toBe('true')
    expect(result.define.__CLIENT__).toBe('true')
    expect(result.define.__VITUS_LABS_STORIES__).toBeDefined()
  })

  it('should add tsconfigPaths plugin in viteFinal', async () => {
    const viteConfig: any = { define: {}, plugins: [] }

    await STORYBOOK_CONFIG.viteFinal!(viteConfig, {} as any)

    expect(viteConfig.plugins).toHaveLength(1)
    expect(viteConfig.plugins[0]).toHaveProperty('name', 'mock-tsconfig-paths')
  })

  it('should handle viteFinal when define already exists', async () => {
    const viteConfig: any = { define: { existing: true }, plugins: [] }

    const result = await STORYBOOK_CONFIG.viteFinal!(viteConfig, {} as any)

    expect(result.define.existing).toBe(true)
    expect(result.define.__BROWSER__).toBe('true')
  })
})
