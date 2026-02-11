// Webpack loader — compiled to CJS by TypeScript
const pictureExportLoader = (content: Buffer): string => {
  return `${content
    .toString('utf-8')
    .replace(
      'module.exports',
      'var lqip',
    )} module.exports = lqip.preSrc; module.exports = Object.assign(module.exports, lqip);`
}

export = pictureExportLoader
