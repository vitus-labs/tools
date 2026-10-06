import type { StorybookConfig } from '@storybook/react-vite'
import type { Indexer } from 'storybook/internal/types'
import tsconfigPaths from 'vite-tsconfig-paths'
import { CONFIG } from '../config/index.ts'
import {
  createAutoDiscoveryIndexer,
  createManualStoryIndexer,
} from '../indexer/index.ts'
import { rocketstoriesVitePlugin } from '../vite-plugin/index.ts'

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

const resolveFramework = (key: string): StorybookConfig['framework'] => {
  if (key === 'next') {
    return { name: '@storybook/nextjs-vite', options: {} }
  }
  return { name: '@storybook/react-vite', options: {} }
}

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

  // Custom indexers. Storybook picks only the FIRST indexer whose `test`
  // matches a file, so the manual indexer receives the default indexers and
  // delegates standard CSF/MDX story files to them (it only handles
  // rocketstories files itself — the CSF indexer cannot statically parse
  // `export default stories.init()`).
  experimental_indexers: (existingIndexers) => {
    const existing = existingIndexers ?? []
    const indexers: Indexer[] = [createManualStoryIndexer(existing)]

    if (CONFIG.autoDiscovery) indexers.push(autoDiscoveryIndexer)

    return [...indexers, ...existing]
  },

  // Expose the UI theme to the manager (browser) bundle as process.env.
  env: (existingEnv) => ({
    ...existingEnv,
    STORYBOOK_VL_UI_THEME: CONFIG.ui?.theme ?? 'dark',
  }),

  viteFinal: async (config) => {
    // DEFINE GLOBALS
    if (!config.define) {
      config.define = {}
    }

    const isReactNative = CONFIG.framework === 'react-native'

    config.define.__BROWSER__ = JSON.stringify(true)
    config.define.__NATIVE__ = JSON.stringify(isReactNative)
    config.define.__NODE__ = JSON.stringify(false)
    config.define.__WEB__ = JSON.stringify(!isReactNative)
    config.define.__CLIENT__ = JSON.stringify(true)
    config.define.__VITUS_LABS_STORIES__ = JSON.stringify(CONFIG)

    // Platform-specific extension resolution.
    // RN projects: prefer .native.* files, alias react-native to react-native-web.
    // Web projects (vite/next): prefer .web.* files when RN libs are used.
    if (!config.resolve) {
      config.resolve = {}
    }

    const platformExtensions = isReactNative
      ? ['.native.tsx', '.native.ts', '.native.jsx', '.native.js']
      : ['.web.tsx', '.web.ts', '.web.jsx', '.web.js']

    config.resolve.extensions = [
      ...platformExtensions,
      ...(config.resolve.extensions ?? ['.tsx', '.ts', '.jsx', '.js', '.json']),
    ]

    if (isReactNative) {
      config.resolve.alias = {
        ...((config.resolve.alias as Record<string, string>) ?? {}),
        'react-native': 'react-native-web',
      }
    }

    // When using Next.js framework, mock next/font during Vite's dep
    // pre-bundling. npm font packages (e.g. `geist`) import
    // `next/font/local` internally — without this esbuild plugin, the
    // real Next.js module gets baked into the pre-bundled chunk,
    // bypassing @storybook/nextjs-vite's runtime mocks.
    if (CONFIG.framework === 'next') {
      if (!config.optimizeDeps) {
        config.optimizeDeps = {}
      }
      if (!config.optimizeDeps.rolldownOptions) {
        config.optimizeDeps.rolldownOptions = {}
      }
      if (!config.optimizeDeps.rolldownOptions.plugins) {
        config.optimizeDeps.rolldownOptions.plugins = []
      }

      const FONT_MOCK = [
        'export default function fontMock() {',
        "  return { className: '__mocked_font', style: { fontFamily: 'mocked' } }",
        '}',
      ].join('\n')

      const FONT_FILTER =
        /^(next\/font\/(local|google)|@next\/font\/(local|google))$/
      const FONT_MOCK_ID = '\0next-font-mock'

      const rolldownPlugins = config.optimizeDeps.rolldownOptions.plugins
      const fontMockPlugin = {
        name: 'storybook-next-font-mock',
        resolveId(source: string) {
          if (FONT_FILTER.test(source)) return `${FONT_MOCK_ID}:${source}`
        },
        load(id: string) {
          if (id.startsWith(FONT_MOCK_ID)) return FONT_MOCK
        },
      }

      if (Array.isArray(rolldownPlugins)) rolldownPlugins.push(fontMockPlugin)
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
