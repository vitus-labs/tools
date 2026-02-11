// Webpack loader — compiled to CJS by TypeScript
const colorsExportLoader = (content: Buffer): string => {
  return `${content
    .toString('utf-8')
    .replace(
      'module.exports',
      'var lqip',
    )} module.exports = lqip.palette; module.exports = Object.assign(module.exports, lqip);`
}

export = colorsExportLoader
