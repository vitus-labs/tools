export default {
  outDir: '/docs',
  port: 6006,
  ui: {
    theme: 'dark',
  },
  storiesDir: [`/src/**/__stories__/**/*.stories.@(js|jsx|ts|tsx|mdx)`],
  addons: {
    a11y: true,
    backgrounds: true,
    viewport: true,
    docs: false,
  },
  decorators: {
    theme: {},
  },
}
