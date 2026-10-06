import { afterEach, describe, expect, it, vi } from 'vitest'

const build = vi.fn()

vi.mock('storybook/internal/core-server', () => ({ build }))
vi.mock('@vitus-labs/tools-core', () => ({
  TS_CONFIG: {},
  VL_CONFIG: () => ({
    merge: () => ({
      config: {
        outDir: '/docs',
        port: 6006,
        storiesDir: ['/src/*.stories.tsx'],
        monorepoStoriesDir: ['/packages/*/src/*.stories.tsx'],
      },
    }),
  }),
}))
vi.mock('../config/baseConfig.ts', () => ({ default: {} }))

describe('stories bins', () => {
  afterEach(() => {
    delete process.env.VL_MONOREPO
    vi.resetModules()
    build.mockClear()
  })

  it.each([['./run-stories-monorepo.ts'], ['./run-stories-monorepo-build.ts']])(
    '%s activates monorepo globs before config loads',
    async (file) => {
      await import(file)

      expect(build).toHaveBeenCalledTimes(1)
      const { CONFIG } = await import('../config/index.ts')
      expect(CONFIG.storiesDir).toEqual([
        `${process.cwd()}/packages/*/src/*.stories.tsx`,
      ])
    },
  )

  it('run-stories.ts keeps the non-monorepo globs', async () => {
    await import('./run-stories.ts')
    const { CONFIG } = await import('../config/index.ts')
    expect(CONFIG.storiesDir).toEqual([`${process.cwd()}/src/*.stories.tsx`])
  })
})
