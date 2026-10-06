import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Indexer, IndexInput } from 'storybook/internal/types'
import {
  deriveTitle,
  detectComponentKind,
  extractDimensionNames,
  extractExplicitTitle,
  extractNamedExports,
  findManualStories,
  isRocketstoriesPattern,
} from './utils.ts'

// Virtual module prefix for auto-generated stories
export const VIRTUAL_STORY_PREFIX = 'virtual:rocketstory:'

const STORY_FILE_TEST = /\.stories\.([jt]sx?|mdx?)$/

/**
 * Create the manual story indexer.
 *
 * Storybook uses only the FIRST indexer whose `test` matches a file, so this
 * indexer (which matches every `*.stories.*` file) must also handle files it
 * does not own. Rocketstories pattern files are indexed here; everything
 * else is delegated to the first matching existing indexer (the default CSF
 * / MDX indexers), otherwise standard stories would produce no entries.
 */
export const createManualStoryIndexer = (
  delegates: Indexer[] = [],
): Indexer => ({
  test: STORY_FILE_TEST,
  createIndex: async (fileName, opts) => {
    const code = await readFile(fileName, 'utf-8')

    if (isRocketstoriesPattern(code)) {
      const explicitTitle = extractExplicitTitle(code)
      const title = opts.makeTitle(
        explicitTitle ?? deriveTitle(fileName, { isStoryFile: true }),
      )

      return extractNamedExports(code).map((exportName) => ({
        type: 'story' as const,
        importPath: fileName,
        exportName,
        title,
      }))
    }

    const delegate = delegates.find((indexer) => indexer.test.test(fileName))
    return delegate ? delegate.createIndex(fileName, opts) : []
  },
})

/**
 * The manual story indexer without delegates: indexes only rocketstories
 * pattern files.
 */
export const manualStoryIndexer: Indexer = createManualStoryIndexer()

/**
 * Create an auto-discovery indexer that finds components without
 * manual story files and creates virtual story entries for them.
 */
export const createAutoDiscoveryIndexer = (): Indexer => ({
  // Match component index files
  test: /\/index\.[jt]sx?$/,

  createIndex: async (fileName, { makeTitle }) => {
    const code = await readFile(fileName, 'utf-8')
    const kind = detectComponentKind(code)

    // Skip non-component files
    if (kind === 'unknown') return []

    // Skip if manual stories exist for this component
    const componentDir = path.dirname(fileName)
    const manualStories = await findManualStories(componentDir)
    if (manualStories.length > 0) return []

    // Create auto-discovered story entries
    const title = makeTitle(deriveTitle(fileName))
    const entries: IndexInput[] = [
      {
        type: 'story',
        importPath: `${VIRTUAL_STORY_PREFIX}${fileName}`,
        exportName: 'Default',
        title,
      },
    ]

    // For rocketstyle components, add dimension entries
    if (kind === 'rocketstyle') {
      const dimensionNames = extractDimensionNames(code)

      for (const dim of dimensionNames) {
        const exportName = `${dim.charAt(0).toUpperCase() + dim.slice(1)}s`
        entries.push({
          type: 'story',
          importPath: `${VIRTUAL_STORY_PREFIX}${fileName}`,
          exportName,
          title,
        })
      }

      entries.push({
        type: 'story',
        importPath: `${VIRTUAL_STORY_PREFIX}${fileName}`,
        exportName: 'PseudoStates',
        title,
      })
    }

    return entries
  },
})
