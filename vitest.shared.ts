import { configDefaults, defineConfig } from 'vitest/config'

export const createVitestConfig = (extraCoverageExclude: string[] = []) =>
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      mockReset: true,
      include: ['src/**/*.test.ts'],
      exclude: [...configDefaults.exclude, 'lib/**'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: [
          'src/**/*.test.ts',
          'src/**/index.ts',
          'src/bin/**',
          ...extraCoverageExclude,
        ],
        thresholds: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  })
