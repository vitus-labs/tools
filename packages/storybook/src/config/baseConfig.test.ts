import { describe, expect, it, vi } from 'vitest'

vi.mock('storybook/theming', () => ({
  themes: { dark: { base: 'dark' }, light: { base: 'light' } },
}))
vi.mock('storybook/viewport', () => ({
  INITIAL_VIEWPORTS: { iphone14: { name: 'iPhone 14' } },
  MINIMAL_VIEWPORTS: { mobile: { name: 'Mobile' } },
}))

import CONFIG from './baseConfig.js'

describe('storybook baseConfig', () => {
  it('should have correct output and port defaults', () => {
    expect(CONFIG.outDir).toBe('/docs')
    expect(CONFIG.port).toBe(6006)
  })

  it('should have dark UI theme', () => {
    expect(CONFIG.ui.theme).toBe('dark')
  })

  it('should have stories directory patterns', () => {
    expect(CONFIG.storiesDir).toHaveLength(3)
    expect(CONFIG.storiesDir[0]).toContain('__stories__')
  })

  it('should have addon configurations', () => {
    expect(CONFIG.addons.controls).toEqual({ expanded: true })
    expect(CONFIG.addons.a11y).toBe(true)
    expect(CONFIG.addons.docs).toBe(true)
    expect(CONFIG.addons.chromatic).toBe(true)
  })

  it('should have viewport options from storybook', () => {
    expect(CONFIG.addons.viewport.options).toHaveProperty('mobile')
    expect(CONFIG.addons.viewport.options).toHaveProperty('iphone14')
  })

  it('should have darkMode config with themes', () => {
    expect(CONFIG.addons.darkMode.dark).toEqual({ base: 'dark' })
    expect(CONFIG.addons.darkMode.light).toEqual({ base: 'light' })
  })

  it('should have backgrounds config', () => {
    expect(CONFIG.addons.backgrounds.default).toBe('light')
    expect(CONFIG.addons.backgrounds.options.light.value).toBe('#fff')
    expect(CONFIG.addons.backgrounds.options.dark.value).toBe('#000')
    expect(CONFIG.addons.backgrounds.grid.cellSize).toBe(8)
  })

  it('should have decorators config', () => {
    expect(CONFIG.decorators).toHaveProperty('theme')
  })

  it('should have empty globals by default', () => {
    expect(CONFIG.globals).toEqual({})
  })
})
