import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createVitestConfig } from './index.ts'

const runAliasHook = (
  config: ReturnType<typeof createVitestConfig>,
  userConfig: { root?: string } = {},
) => {
  const plugin = (config.plugins as any[]).find(
    (p) => p.name === 'vitus-labs:aliases',
  )
  return plugin.config(userConfig).resolve.alias
}

describe('createVitestConfig', () => {
  it('should not register an alias plugin without aliases', () => {
    expect(createVitestConfig().plugins).toBeUndefined()
  })

  it('should resolve aliases against the Vite project root', () => {
    const config = createVitestConfig({ aliases: { '~/': 'src/' } })
    expect(runAliasHook(config, { root: '/repo/packages/a' })).toEqual({
      '~': '/repo/packages/a/src',
    })
  })

  it('should fall back to process.cwd() when no root is known', () => {
    const config = createVitestConfig({ aliases: { '~/': 'src/' } })
    expect(runAliasHook(config)).toEqual({ '~': resolve(process.cwd(), 'src') })
  })

  it('should prefer the explicit root option', () => {
    const config = createVitestConfig({
      aliases: { '~': 'src' },
      root: '/explicit',
    })
    expect(runAliasHook(config, { root: '/other' })).toEqual({
      '~': '/explicit/src',
    })
  })

  it('should keep absolute alias targets', () => {
    const config = createVitestConfig({ aliases: { '~': '/abs/src' } })
    expect(runAliasHook(config, { root: '/repo' })).toEqual({ '~': '/abs/src' })
  })

  it('should keep user plugins after the alias plugin', () => {
    const user = { name: 'user' }
    const config = createVitestConfig({
      aliases: { '~': 'src' },
      plugins: [user],
    })
    expect(config.plugins).toHaveLength(2)
    expect((config.plugins as any[])[1]).toBe(user)
  })

  it('should accept a string array as coverageExclude shorthand', () => {
    const config = createVitestConfig(['src/x/**'])
    expect(config.test?.coverage?.exclude).toContain('src/x/**')
  })

  it('should append coverageInclude and leave pool undefined by default', () => {
    const config = createVitestConfig({ coverageInclude: ['lib/**'] })
    expect(config.test?.coverage?.include).toContain('lib/**')
    expect(config.test?.pool).toBeUndefined()
  })
})
