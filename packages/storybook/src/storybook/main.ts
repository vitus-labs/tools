import { readFile } from 'node:fs/promises'
import type { StorybookConfig } from '@storybook/react-vite'
import type { Indexer } from 'storybook/internal/types'
import tsconfigPaths from 'vite-tsconfig-paths'
import { CONFIG } from '../config/index.js'
import {
  createAutoDiscoveryIndexer,
  manualStoryIndexer,
} from '../indexer/index.js'
import { isRocketstoriesPattern } from '../indexer/utils.js'
import { rocketstoriesVitePlugin } from '../vite-plugin/index.js'

// --------------------------------------------------------
// STORYBOOK ADDONS LIST
// Only external addons — essentials (actions, backgrounds,
// controls, measure, outline, toolbars, viewport) are
// built into Storybook 10 core.
// --------------------------------------------------------
const ADDONS_MAP: Record<string, string> = {
  a11y: '@storybook/addon-a11y',
  chromatic: '@chromatic-com/storybook',
  designs: '@storybook/addon-designs',
  docs: '@storybook/addon-docs',
  mode: '@vueless/storybook-dark-mode',
  pseudoStates: 'storybook-addon-pseudo-states',
  themes: '@storybook/addon-themes',
  vitest: '@storybook/addon-vitest',
}

const resolveFramework = (key: string): StorybookConfig['framework'] =>
  key === 'next'
    ? { name: '@storybook/nextjs-vite', options: {} }
    : { name: '@storybook/react-vite', options: {} }

const autoDiscoveryIndexer = createAutoDiscoveryIndexer()

// --------------------------------------------------------
// STORYBOOK CONFIGURATION
// --------------------------------------------------------
const STORYBOOK_CONFIG: StorybookConfig = {
  framework: resolveFramework(CONFIG.framework),
  stories: CONFIG.storiesDir,
  addons: Object.entries(CONFIG.addons).reduce((acc, [key, value]) => {
    const addon = ADDONS_MAP[key]
    if (addon && value && value !== null) {
      acc.push(addon)
    }

    return acc
  }, [] as any),

  // Custom indexers: rocketstories first, then auto-discovery,
  // then default CSF indexer (wrapped to skip rocketstories files)
  experimental_indexers: (existingIndexers) => {
    // Wrap existing indexers so they skip rocketstories files —
    // without this, the CSF indexer tries to statically parse
    // `export default stories.init()` and fails.
    const wrapped: Indexer[] = (existingIndexers ?? []).map((indexer) => ({
      ...indexer,
      createIndex: async (fileName: string, opts: any) => {
        if (/\.stories\.([jt]sx?|mdx?)$/.test(fileName)) {
          const code = await readFile(fileName, 'utf-8')
          if (isRocketstoriesPattern(code)) return []
        }
        return indexer.createIndex(fileName, opts)
      },
    }))

    return [manualStoryIndexer, autoDiscoveryIndexer, ...wrapped]
  },

  viteFinal: async (config) => {
    // DEFINE GLOBALS
    if (!config.define) {
      config.define = {}
    }

    config.define.__BROWSER__ = JSON.stringify(true)
    config.define.__NATIVE__ = JSON.stringify(false)
    config.define.__NODE__ = JSON.stringify(true)
    config.define.__WEB__ = JSON.stringify(true)
    config.define.__CLIENT__ = JSON.stringify(true)
    config.define.__VITUS_LABS_STORIES__ = JSON.stringify(CONFIG)

    // When using Next.js framework, exclude mocked Next.js modules from
    // dep optimization so @storybook/nextjs-vite's mocks intercept at runtime.
    // Without this, Vite pre-bundles deps that import these modules and
    // resolves the real Next.js code instead of the Storybook mocks.
    if (CONFIG.framework === 'next') {
      if (!config.optimizeDeps) {
        config.optimizeDeps = {}
      }
      config.optimizeDeps.exclude = [
        ...(config.optimizeDeps.exclude ?? []),
        'next/font/local',
        'next/font/google',
        'next/image',
        'next/navigation',
        'next/router',
        'next/link',
        'next/head',
        'next/dynamic',
        '@next/font/local',
        '@next/font/google',
      ]
    }

    // VITE PLUGINS
    config.plugins?.push(
      tsconfigPaths({ root: process.cwd() }),
      rocketstoriesVitePlugin(),
    )

    return config
  },
}

export default STORYBOOK_CONFIG
