import { resolve } from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'

export interface CoverageThresholds {
  statements?: number
  branches?: number
  functions?: number
  lines?: number
}

export interface VitestConfigOptions {
  /** Extra glob patterns to exclude from coverage (appended to defaults) */
  coverageExclude?: string[]
  /** Extra glob patterns to include in coverage (appended to defaults) */
  coverageInclude?: string[]
  /** Override default 90% coverage thresholds */
  coverageThresholds?: CoverageThresholds
  /** Vite plugins (e.g. tilde resolve, tsconfig paths) */
  plugins?: unknown[]
  /** Setup files to run before each test (e.g. '@testing-library/jest-dom/vitest') */
  setupFiles?: string[]
  /** Test environment — 'node' (default), 'jsdom', 'happy-dom', etc. */
  environment?: string
  /**
   * Resolve path aliases (e.g. { '~/': 'src/' }). Relative targets are
   * resolved against the project root (see `root`), absolute targets are kept.
   */
  aliases?: Record<string, string>
  /**
   * Directory that relative `aliases` targets are resolved against.
   * Defaults to the Vite/Vitest project root, falling back to `process.cwd()`.
   */
  root?: string
  /** Process CSS imports (default: false — CSS files are replaced with empty strings and CSS modules use non-scoped class names) */
  css?: boolean
  /** Test timeout in milliseconds (default: 5000) */
  testTimeout?: number
  /** Worker pool — 'forks' (Vitest default), 'threads', 'vmThreads', 'vmForks' */
  pool?: 'threads' | 'forks' | 'vmThreads' | 'vmForks'
  /** Extra glob patterns to include in test discovery */
  include?: string[]
  /** Extra glob patterns to exclude from test discovery */
  exclude?: string[]
}

const DEFAULT_THRESHOLDS: Required<CoverageThresholds> = {
  statements: 90,
  branches: 90,
  functions: 90,
  lines: 90,
}

/** Default coverage exclude patterns — exported for consumers using mergeConfig */
export const DEFAULT_COVERAGE_EXCLUDE = [
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
  'src/**/index.ts',
  'src/bin/**',
]

/** Default coverage include patterns — exported for consumers using mergeConfig */
export const DEFAULT_COVERAGE_INCLUDE = ['src/**/*.ts', 'src/**/*.tsx']

const buildAliases = (
  aliases: Record<string, string>,
  root: string,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => {
      // Convert shorthand like '~/' → regex-style match
      const cleanKey = key.endsWith('/') ? key.slice(0, -1) : key
      return [cleanKey, resolve(root, value)]
    }),
  )

/**
 * Plugin that resolves aliases lazily, once the project root is known, so
 * they work when Vitest runs from a monorepo root (`test.projects`).
 */
const aliasPlugin = (aliases: Record<string, string>, root?: string) => ({
  name: 'vitus-labs:aliases',
  config: (config: { root?: string }) => ({
    resolve: {
      alias: buildAliases(
        aliases,
        root ? resolve(root) : resolve(config.root ?? process.cwd()),
      ),
    },
  }),
})

/**
 * Create a vitest config with sensible defaults.
 *
 * Accepts either an options object or a string array (legacy shorthand
 * for `coverageExclude`).
 */
export const createVitestConfig = (
  options: VitestConfigOptions | string[] = {},
) => {
  const opts = Array.isArray(options) ? { coverageExclude: options } : options

  const plugins = [
    ...(opts.aliases ? [aliasPlugin(opts.aliases, opts.root)] : []),
    ...(opts.plugins ?? []),
  ]

  return defineConfig({
    plugins: plugins.length ? (plugins as any) : undefined,
    test: {
      globals: true,
      environment: opts.environment ?? 'node',
      mockReset: true,
      setupFiles: opts.setupFiles,
      testTimeout: opts.testTimeout,
      pool: opts.pool,
      css: opts.css ? true : { modules: { classNameStrategy: 'non-scoped' } },
      include: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        ...(opts.include ?? []),
      ],
      exclude: [...configDefaults.exclude, 'lib/**', ...(opts.exclude ?? [])],
      coverage: {
        provider: 'v8',
        include: [...DEFAULT_COVERAGE_INCLUDE, ...(opts.coverageInclude ?? [])],
        exclude: [...DEFAULT_COVERAGE_EXCLUDE, ...(opts.coverageExclude ?? [])],
        thresholds: {
          ...DEFAULT_THRESHOLDS,
          ...opts.coverageThresholds,
        },
      },
    },
  })
}
