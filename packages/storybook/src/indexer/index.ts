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
} from './utils.js'

// Virtual module prefix for auto-generated stories
export const VIRTUAL_STORY_PREFIX = 'virtual:rocketstory:'

/**
 * Index a manual story file (.stories.tsx).
 * Handles rocketstories pattern files — returns empty for
 * standard CSF files so the default indexer handles them.
 */
const indexManualStoryFile = async (
  fileName: string,
  makeTitle: (title?: string) => string,
): Promise<IndexInput[]> => {
  const code = await readFile(fileName, 'utf-8')

  // Only handle rocketstories pattern — let default CSF indexer
  // handle standard story files
  if (!isRocketstoriesPattern(code)) return []

  const explicitTitle = extractExplicitTitle(code)
  const title = makeTitle(
    explicitTitle ?? deriveTitle(fileName, { isStoryFile: true }),
  )
  const namedExports = extractNamedExports(code)

  return namedExports.map((exportName) => ({
    type: 'story' as const,
    importPath: fileName,
    exportName,
    title,
  }))
}

/**
 * The manual story indexer.
 * Indexes .stories.tsx files that use the rocketstories init() pattern.
 */
export const manualStoryIndexer: Indexer = {
  test: /\.stories\.([jt]sx?|mdx?)$/,
  createIndex: async (fileName, { makeTitle }) =>
    indexManualStoryFile(fileName, makeTitle),
}

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
