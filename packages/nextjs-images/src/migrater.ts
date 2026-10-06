import chalk from 'chalk'

const pointer = '\u203A' // › character, replaces figures dependency

const prefix = `${chalk.gray('next-optimized-images')} ${chalk.red(pointer)}`

/**
 * Output a warning when images should get optimized (prod build) but no optimization
 * package is installed.
 */
const showWarning = (): void =>
  console.log(
    `${prefix} ${chalk.red('WARNING!')}
${prefix} ${chalk.red('No package found which can optimize images.')}
${prefix} Starting from version ${chalk.cyan('2')} of ${chalk.cyan(
      'next-optimized-images',
    )}, all optimization is optional and you can choose which ones you want to use.
${prefix} For help during the setup and installation, please read ${chalk.underline(
      'https://github.com/vitus-labs/tools#optimization-packages',
    )}

${prefix} If you recently ${chalk.cyan(
      'updated from v1 to v2',
    )}, please read ${chalk.underline(
      'https://github.com/vitus-labs/tools/tree/main/packages/nextjs-images#readme',
    )}
${prefix} If this is on purpose and you don't want this plugin to optimize the images, set the option ${chalk.cyan(
      '`optimizeImages: false`',
    )} to hide this warning.
`,
  )

let turbopackWarningShown = false

/**
 * Output a one-time warning when Next.js runs with Turbopack, which ignores
 * the `webpack` config function this plugin relies on.
 */
const showTurbopackWarning = (): void => {
  if (turbopackWarningShown) return
  turbopackWarningShown = true

  console.log(
    `${prefix} ${chalk.red('WARNING!')}
${prefix} Next.js is running with ${chalk.cyan('Turbopack')}, which ignores webpack loaders configured by this plugin.
${prefix} Run ${chalk.cyan('next build --webpack')} / ${chalk.cyan(
      'next dev --webpack',
    )} to enable image optimization.
`,
  )
}

export { showTurbopackWarning, showWarning }
