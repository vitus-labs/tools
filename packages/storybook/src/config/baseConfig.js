module.exports = {
  outDir: `${process.cwd()}/docs`,
  port: 6006,
  ui: {
    theme: 'dark',
  },
  stories: [
    `${process.cwd()}/**/__stories__/**/*.stories.@(js|jsx|ts|tsx|mdx)`,
  ],
  addons: {
    a11y: true,
    backgrounds: true,
    viewport: true,
    docs: false,
  },
  theme: {},
}
