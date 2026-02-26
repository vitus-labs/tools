import { configDefaults, defineConfig } from 'vitest/config'

export interface CoverageThresholds {
  statements?: number
  branches?: number
  functions?: number
  lines?: number
}

export interface VitestConfigOptions {
  /** Extra glob patterns to exclude from coverage */
  coverageExclude?: string[]
  /** Override default 90% coverage thresholds */
  coverageThresholds?: CoverageThresholds
  /** Vite plugins (e.g. tilde resolve, tsconfig paths) */
  plugins?: any[]
  /** Setup files to run before each test (e.g. '@testing-library/jest-dom/vitest') */
  setupFiles?: string[]
  /** Test environment — 'node' (default), 'jsdom', 'happy-dom', etc. */
  environment?: string
  /** Resolve path aliases (e.g. { '~/': 'src/' }) */
  aliases?: Record<string, string>
  /** Auto-mock CSS imports — useful for jsdom/happy-dom environments (default: false) */
  css?: boolean
  /** Test timeout in milliseconds (default: 5000) */
  testTimeout?: number
  /** Worker pool — 'threads' (default), 'forks', 'vmThreads', 'vmForks' */
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

const buildAliases = (
  aliases: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => {
      // Convert shorthand like '~/' → regex-style match
      const cleanKey = key.endsWith('/') ? key.slice(0, -1) : key
      const cleanValue = value.endsWith('/') ? value.slice(0, -1) : value
      return [cleanKey, `${process.cwd()}/${cleanValue}`]
    }),
  )

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

  const aliases = opts.aliases ? buildAliases(opts.aliases) : undefined

  return defineConfig({
    plugins: opts.plugins,
    resolve: aliases ? { alias: aliases } : undefined,
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
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/index.ts',
          'src/bin/**',
          ...(opts.coverageExclude ?? []),
        ],
        thresholds: {
          ...DEFAULT_THRESHOLDS,
          ...opts.coverageThresholds,
        },
      },
    },
  })
}
