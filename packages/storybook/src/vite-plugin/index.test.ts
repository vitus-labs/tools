import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

import { readFile } from 'node:fs/promises'
import { rocketstoriesVitePlugin } from './index.js'

const mockReadFile = vi.mocked(readFile)

const defaultConfig = {
  module: '@vitus-labs/rocketstories',
  export: 'rocketstories',
}

describe('rocketstoriesVitePlugin', () => {
  const plugin = rocketstoriesVitePlugin(defaultConfig)

  it('should have correct name', () => {
    expect(plugin.name).toBe('vite-plugin-rocketstories')
  })

  describe('resolveId', () => {
    const resolveId = plugin.resolveId as (id: string) => string | undefined

    it('should resolve virtual:rocketstory: prefixed ids', () => {
      const result = resolveId(
        'virtual:rocketstory:/project/src/Badge/index.tsx',
      )
      expect(result).toBe('\0virtual:rocketstory:/project/src/Badge/index.tsx')
    })

    it('should not resolve other ids', () => {
      const result = resolveId('/project/src/Badge/index.tsx')
      expect(result).toBeUndefined()
    })
  })

  describe('load', () => {
    const load = plugin.load as (id: string) => Promise<string | undefined>

    it('should not load non-virtual ids', async () => {
      const result = await load('/project/src/Badge/index.tsx')
      expect(result).toBeUndefined()
    })

    it('should generate plain story for React components', async () => {
      mockReadFile.mockResolvedValue(
        'export default function Badge() { return <div /> }',
      )

      const result = await load(
        '\0virtual:rocketstory:/project/src/Badge/index.tsx',
      )

      expect(result).toContain(
        "import Component from '/project/src/Badge/index.tsx'",
      )
      expect(result).toContain("title: 'Badge'")
      expect(result).toContain('component: Component')
      expect(result).toContain('export const Default')
    })

    it('should generate rocketstyle story with dimensions', async () => {
      mockReadFile.mockResolvedValue(`
        export default component
          .config({ name: 'Badge' })
          .states({ active: true })
          .sizes({ sm: {}, md: {}, lg: {} })
          .theme(t)
      `)

      const result = await load(
        '\0virtual:rocketstory:/project/src/Badge/index.tsx',
      )

      expect(result).toContain(
        "import { rocketstories } from '@vitus-labs/rocketstories'",
      )
      expect(result).toContain(
        "import Component from '/project/src/Badge/index.tsx'",
      )
      expect(result).toContain('rocketstories(Component)')
      expect(result).toContain("label: 'Badge'")
      expect(result).toContain('export default stories.init')
      expect(result).toContain('export const Default = stories.main()')
      expect(result).toContain(
        "export const States = stories.dimension('state')",
      )
      expect(result).toContain("export const Sizes = stories.dimension('size')")
      expect(result).toContain('export const PseudoStates')
    })

    it('should extract component name from directory', async () => {
      mockReadFile.mockResolvedValue(
        'export default function Card() { return <div /> }',
      )

      const result = await load(
        '\0virtual:rocketstory:/project/src/Card/index.tsx',
      )

      expect(result).toContain("title: 'Card'")
    })

    it('should generate PseudoStates with pseudo-state rendering', async () => {
      mockReadFile.mockResolvedValue(`
        export default component.config({ name: 'Badge' }).theme(t)
      `)

      const result = await load(
        '\0virtual:rocketstory:/project/src/Badge/index.tsx',
      )

      expect(result).toContain('PseudoStates')
      expect(result).toContain('data-pseudo')
      expect(result).toContain('data-disabled')
      expect(result).toContain(
        "'normal', 'hover', 'focus', 'active', 'disabled'",
      )
    })

    it('should use custom rocketstories module and export', async () => {
      const customPlugin = rocketstoriesVitePlugin({
        module: '@my-org/tools-rocketstories',
        export: 'storyOf',
      })
      const customLoad = customPlugin.load as (
        id: string,
      ) => Promise<string | undefined>

      mockReadFile.mockResolvedValue(`
        export default component.config({ name: 'Badge' }).theme(t)
      `)

      const result = await customLoad(
        '\0virtual:rocketstory:/project/src/Badge/index.tsx',
      )

      expect(result).toContain(
        "import { storyOf } from '@my-org/tools-rocketstories'",
      )
      expect(result).toContain('storyOf(Component)')
    })
  })
})
