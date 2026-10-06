import { afterEach, describe, expect, it, vi } from 'vitest'

const load = async (stories: Record<string, unknown>) => {
  vi.resetModules()
  ;(globalThis as any).__VITUS_LABS_STORIES__ = stories
  return (await import('./preview.ts')).default
}

describe('preview', () => {
  afterEach(() => {
    delete (globalThis as any).__VITUS_LABS_STORIES__
  })

  it('maps backgrounds.default onto the backgrounds global', async () => {
    const preview = await load({
      framework: 'vite',
      globals: { locale: 'en' },
      addons: { backgrounds: { default: 'dark', options: {} } },
    })
    expect(preview.initialGlobals).toEqual({
      locale: 'en',
      backgrounds: { value: 'dark' },
    })
  })

  it('lets explicit globals.backgrounds win', async () => {
    const preview = await load({
      framework: 'vite',
      globals: { backgrounds: { value: 'light' } },
      addons: { backgrounds: { default: 'dark' } },
    })
    expect(preview.initialGlobals).toEqual({ backgrounds: { value: 'light' } })
  })

  it('sets no backgrounds global without a default', async () => {
    const preview = await load({ framework: 'vite', globals: {}, addons: {} })
    expect(preview.initialGlobals).toEqual({})
  })
})
