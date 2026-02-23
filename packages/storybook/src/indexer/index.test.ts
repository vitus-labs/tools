import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('./utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils.js')>()
  return {
    ...actual,
    findManualStories: vi.fn(),
  }
})

import { readFile } from 'node:fs/promises'
import {
  createAutoDiscoveryIndexer,
  manualStoryIndexer,
  VIRTUAL_STORY_PREFIX,
} from './index.js'
import { findManualStories } from './utils.js'

const mockReadFile = vi.mocked(readFile)
const mockFindManualStories = vi.mocked(findManualStories)
const mockMakeTitle = vi.fn((title?: string) => title ?? 'Fallback')

describe('VIRTUAL_STORY_PREFIX', () => {
  it('should be defined', () => {
    expect(VIRTUAL_STORY_PREFIX).toBe('virtual:rocketstory:')
  })
})

describe('manualStoryIndexer', () => {
  it('should match .stories.tsx files', () => {
    expect(manualStoryIndexer.test.test('Badge.stories.tsx')).toBe(true)
    expect(manualStoryIndexer.test.test('Card.stories.ts')).toBe(true)
    expect(manualStoryIndexer.test.test('Button.stories.jsx')).toBe(true)
  })

  it('should match .stories.md and .stories.mdx files', () => {
    expect(manualStoryIndexer.test.test('Badge.stories.mdx')).toBe(true)
    expect(manualStoryIndexer.test.test('Docs.stories.md')).toBe(true)
  })

  it('should not match non-story files', () => {
    expect(manualStoryIndexer.test.test('Badge.tsx')).toBe(false)
    expect(manualStoryIndexer.test.test('index.ts')).toBe(false)
  })

  it('should return empty array for standard CSF files', async () => {
    mockReadFile.mockResolvedValue(
      "export default { title: 'Badge', component: Badge }",
    )

    const result = await manualStoryIndexer.createIndex(
      '/project/src/Badge/__stories__/Badge.stories.tsx',
      { makeTitle: mockMakeTitle } as any,
    )

    expect(result).toEqual([])
  })

  it('should index rocketstories pattern files', async () => {
    mockReadFile.mockResolvedValue(`
      export default stories.init()
      export const Default = stories.main()
      export const States = stories.dimension('state')
    `)

    const result = await manualStoryIndexer.createIndex(
      '/project/packages/ui-base/src/Badge/__stories__/Badge.stories.tsx',
      { makeTitle: mockMakeTitle } as any,
    )

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      type: 'story',
      importPath:
        '/project/packages/ui-base/src/Badge/__stories__/Badge.stories.tsx',
      exportName: 'Default',
      title: 'ui-base/Badge',
    })
    expect(result[1]).toEqual({
      type: 'story',
      importPath:
        '/project/packages/ui-base/src/Badge/__stories__/Badge.stories.tsx',
      exportName: 'States',
      title: 'ui-base/Badge',
    })
  })

  it('should use explicit title from .config() when present', async () => {
    mockReadFile.mockResolvedValue(`
      .config({ name: 'Custom/Title' })
      export default stories.init()
      export const Default = stories.main()
    `)

    const result = await manualStoryIndexer.createIndex(
      '/project/src/Badge/__stories__/Badge.stories.tsx',
      { makeTitle: mockMakeTitle } as any,
    )

    expect(result).toHaveLength(1)
    expect(mockMakeTitle).toHaveBeenCalledWith('Custom/Title')
  })
})

describe('createAutoDiscoveryIndexer', () => {
  const indexer = createAutoDiscoveryIndexer()

  it('should match index files', () => {
    expect(indexer.test.test('/src/Badge/index.tsx')).toBe(true)
    expect(indexer.test.test('/src/Card/index.ts')).toBe(true)
    expect(indexer.test.test('/src/Button/index.jsx')).toBe(true)
  })

  it('should not match non-index files', () => {
    expect(indexer.test.test('/src/Badge/Badge.tsx')).toBe(false)
    expect(indexer.test.test('/src/utils.ts')).toBe(false)
  })

  it('should return empty array for non-component files', async () => {
    mockReadFile.mockResolvedValue('export const utils = {}')

    const result = await indexer.createIndex(
      '/project/packages/ui-base/src/utils/index.ts',
      { makeTitle: mockMakeTitle } as any,
    )

    expect(result).toEqual([])
  })

  it('should skip components with manual stories', async () => {
    mockReadFile.mockResolvedValue(
      'export default const Badge: FC = () => <div />',
    )
    mockFindManualStories.mockResolvedValue([
      '/project/src/Badge/__stories__/Badge.stories.tsx',
    ])

    const result = await indexer.createIndex(
      '/project/packages/ui-base/src/Badge/index.tsx',
      { makeTitle: mockMakeTitle } as any,
    )

    expect(result).toEqual([])
  })

  it('should create Default story for plain React components', async () => {
    mockReadFile.mockResolvedValue(
      'export default function Badge() { return <div /> }',
    )
    mockFindManualStories.mockResolvedValue([])

    const result = await indexer.createIndex(
      '/project/packages/ui-base/src/Badge/index.tsx',
      { makeTitle: mockMakeTitle } as any,
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      type: 'story',
      importPath:
        'virtual:rocketstory:/project/packages/ui-base/src/Badge/index.tsx',
      exportName: 'Default',
      title: 'ui-base/Badge',
    })
  })

  it('should create dimension and PseudoStates entries for rocketstyle components', async () => {
    mockReadFile.mockResolvedValue(`
      export default component
        .config({ name: 'Badge' })
        .states({ active: true })
        .sizes({ sm: {}, md: {}, lg: {} })
        .theme(t)
    `)
    mockFindManualStories.mockResolvedValue([])

    const result = await indexer.createIndex(
      '/project/packages/ui-base/src/Badge/index.tsx',
      { makeTitle: mockMakeTitle } as any,
    )

    // Default + States + Sizes + PseudoStates = 4
    expect(result).toHaveLength(4)

    const exportNames = result.map((r) => r.exportName)
    expect(exportNames).toEqual(['Default', 'States', 'Sizes', 'PseudoStates'])

    // All should use the virtual prefix
    for (const entry of result) {
      expect(entry.importPath).toMatch(/^virtual:rocketstory:/)
    }
  })
})
