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

    // When using Next.js framework, mock next/font during Vite's dep
    // pre-bundling. npm font packages (e.g. `geist`) import
    // `next/font/local` internally — without this esbuild plugin, the
    // real Next.js module gets baked into the pre-bundled chunk,
    // bypassing @storybook/nextjs-vite's runtime mocks.
    if (CONFIG.framework === 'next') {
      if (!config.optimizeDeps) {
        config.optimizeDeps = {}
      }
      if (!config.optimizeDeps.esbuildOptions) {
        config.optimizeDeps.esbuildOptions = {}
      }
      if (!config.optimizeDeps.esbuildOptions.plugins) {
        config.optimizeDeps.esbuildOptions.plugins = []
      }

      const FONT_MOCK = [
        'export default function fontMock() {',
        "  return { className: '__mocked_font', style: { fontFamily: 'mocked' } }",
        '}',
      ].join('\n')

      config.optimizeDeps.esbuildOptions.plugins.push({
        name: 'storybook-next-font-mock',
        setup(build) {
          const filter =
            /^(next\/font\/(local|google)|@next\/font\/(local|google))$/

          build.onResolve({ filter }, (args) => ({
            path: args.path,
            namespace: 'next-font-mock',
          }))

          build.onLoad({ filter: /.*/, namespace: 'next-font-mock' }, () => ({
            contents: FONT_MOCK,
            loader: 'js',
          }))
        },
      })
    }

    // VITE PLUGINS
    config.plugins?.push(
      tsconfigPaths({ root: process.cwd() }),
      rocketstoriesVitePlugin(CONFIG.rocketstories),
    )

    return config
  },
}

export default STORYBOOK_CONFIG
