import { themes } from 'storybook/theming'
import { INITIAL_VIEWPORTS, MINIMAL_VIEWPORTS } from 'storybook/viewport'

const CONFIG: Record<string, any> = {
  outDir: '/docs',
  port: 6006,
  framework: 'vite',
  ui: {
    theme: 'dark',
  },
  storiesDir: [`/src/**/*.stories.@(js|jsx|ts|tsx|md|mdx)`],
  monorepoStoriesDir: [`/packages/*/src/**/*.stories.@(js|jsx|ts|tsx|md|mdx)`],
  globals: {},
  addons: {
    controls: { expanded: true },
    actions: true,
    a11y: true,
    toolbars: true,
    docs: true,
    viewport: {
      options: { ...MINIMAL_VIEWPORTS, ...INITIAL_VIEWPORTS },
    },
    chromatic: true,
    designs: true,
    mode: true,
    pseudoStates: true,
    themes: true,
    vitest: true,
    measure: true,
    outline: true,
    darkMode: {
      dark: themes.dark,
      light: themes.light,
    },
    backgrounds: {
      default: 'light',
      options: {
        light: { name: 'Light', value: '#fff' },
        dark: { name: 'Dark', value: '#000' },
      },
      grid: {
        disable: false,
        cellSize: 8,
        opacity: 0.5,
        cellAmount: 4,
        offsetX: 16,
        offsetY: 16,
      },
    },
  },
  rocketstories: {
    module: '@vitus-labs/rocketstories',
    export: 'rocketstories',
  },
}

export default CONFIG
