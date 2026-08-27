import { gzipSync } from 'node:zlib'

/** Wraps one piece of the report, e.g. `chalk.dim`. */
type Formatter = (text: string) => string

const identity: Formatter = (text) => text

export type FilesizeOptions = {
  /** Styles the emitted file name. Default: unstyled. */
  name?: Formatter
  /** Styles the size column. Default: unstyled. */
  value?: Formatter
  /** Sink for each reported line. Default: `console.log`. */
  log?: (message: string) => void
}

const UNITS = ['B', 'kB', 'MB', 'GB'] as const

/**
 * Human-readable byte count in base 1000, matching how registries and CDNs
 * report bundle sizes.
 *
 * Exported for this module's own tests only — deliberately not re-exported
 * from the package index, so it stays out of the public API.
 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1000) return `${bytes} B`

  let size = bytes
  let unit = 0

  while (size >= 1000 && unit < UNITS.length - 1) {
    size /= 1000
    unit += 1
  }

  return `${size.toFixed(2)} ${UNITS[unit]}`
}

/**
 * A bundle entry as handed to `generateBundle`. Rollup tags entries with
 * `type`, older/other implementations use `isAsset` — both are handled so the
 * plugin can be shared between the rollup and rolldown packages.
 */
type BundleEntry = {
  type?: string
  isAsset?: boolean
  code?: string
  fileName?: string
}

const isAsset = (entry: BundleEntry): boolean =>
  entry.type !== undefined ? entry.type === 'asset' : entry.isAsset === true

/**
 * Reports the size of every emitted chunk after a build.
 *
 * Replaces `rollup-plugin-filesize`, which pulled a full npm client
 * (`pacote` -> `cacache` -> `tar`, plus `node-gyp` and `colors`) into the
 * dependency tree of every consumer just to print these numbers.
 *
 * Sizes are measured on the bytes actually emitted. `rollup-plugin-filesize`
 * ran the chunk through terser first and gzipped *that*, so its gzip figure
 * described a hypothetical minified build rather than the real output.
 */
const filesize = (options: FilesizeOptions = {}) => {
  const {
    name = identity,
    value = identity,
    log = (message: string) => console.log(message),
  } = options

  return {
    name: 'vl-filesize',
    generateBundle(
      _outputOptions: unknown,
      bundle: Record<string, BundleEntry>,
    ) {
      for (const entry of Object.values(bundle)) {
        // Assets (sourcemaps, copied files) carry no `code` to measure.
        if (isAsset(entry) || typeof entry.code !== 'string') continue

        const raw = Buffer.from(entry.code, 'utf8')
        const sizes = `${formatBytes(raw.byteLength)} · ${formatBytes(
          gzipSync(raw).byteLength,
        )} gzip`

        log(`  ${name(entry.fileName ?? '<unknown>')} ${value(sizes)}`)
      }
    },
  }
}

export { filesize, formatBytes }
