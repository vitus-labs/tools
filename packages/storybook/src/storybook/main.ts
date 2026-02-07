import type { StorybookConfig } from '@storybook/react-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { CONFIG } from '../config/index.js'

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

// --------------------------------------------------------
// STORYBOOK CONFIGURATION
// --------------------------------------------------------
const STORYBOOK_CONFIG: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: CONFIG.storiesDir,
  addons: Object.entries(CONFIG.addons).reduce((acc, [key, value]) => {
    const addon = ADDONS_MAP[key]
    if (addon && value && value !== null) {
      acc.push(addon)
    }

    return acc
  }, [] as any),
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

    // DEFINE TYPESCRIPT PATHS
    config.plugins?.push(tsconfigPaths({ root: process.cwd() }))

    return config
  },
}

export default STORYBOOK_CONFIG
