module.exports = {
  sourceDir: 'src',
  outDir: `${process.cwd()}/docs`,
  port: 6006,
  ui: {
    theme: 'dark',
  },
  stories: [
    `${process.cwd()}/src/**/*.stories.@(js|jsx|ts|tsx|mdx)`,
    `${process.cwd()}/src/**/stories.@(js|jsx|ts|tsx|mdx)`,
  ],
  addons: {
    a11y: true,
    backgrounds: true,
    viewport: true,
    docs: false,
  },
  theme: {
    rootSize: 16,
    breakpoints: {
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
    },
    grid: {
      columns: 12,
      container: {
        xs: '100%',
        sm: 540,
        md: 720,
        lg: 960,
        xl: 1140,
      },
    },
  },
}
