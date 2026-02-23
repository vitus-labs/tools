/**
 * Webpack loader that re-exports a specific property from the lqip-loader output.
 *
 * Webpack 5's loader-runner v4+ supports ESM loaders via import() when
 * the package type is "module", so no CJS wrapper is needed.
 */
interface LoaderContext {
  getOptions(): { exportProperty: string }
}

export default function lqipExportLoader(
  this: LoaderContext,
  content: Buffer,
): string {
  const { exportProperty } = this.getOptions()

  return `${content
    .toString('utf-8')
    .replace(
      'module.exports',
      'var lqip',
    )} module.exports = lqip.${exportProperty}; module.exports = Object.assign(module.exports, lqip);`
}
