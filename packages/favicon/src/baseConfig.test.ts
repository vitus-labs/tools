import { describe, expect, it } from 'vitest'
import { configuration } from './baseConfig.js'

describe('favicon baseConfig', () => {
  it('should have correct default display settings', () => {
    expect(configuration.dir).toBe('auto')
    expect(configuration.lang).toBe('en-US')
    expect(configuration.display).toBe('standalone')
    expect(configuration.orientation).toBe('any')
  })

  it('should have correct color settings', () => {
    expect(configuration.background).toBe('#fff')
    expect(configuration.theme_color).toBe('#fff')
  })

  it('should have apple status bar style', () => {
    expect(configuration.appleStatusBarStyle).toBe('black-translucent')
  })

  it('should have correct URL settings', () => {
    expect(configuration.scope).toBe('/')
    expect(configuration.start_url).toBe('/?homescreen=1')
  })

  it('should have logging disabled by default', () => {
    expect(configuration.logging).toBe(false)
    expect(configuration.pixel_art).toBe(false)
    expect(configuration.loadManifestWithCredentials).toBe(false)
  })

  it('should have all icon platforms enabled', () => {
    const { icons } = configuration
    expect(icons.android).toBe(true)
    expect(icons.appleIcon).toBe(true)
    expect(icons.appleStartup).toBe(true)
    expect(icons.coast).toBe(true)
    expect(icons.favicons).toBe(true)
    expect(icons.firefox).toBe(true)
    expect(icons.windows).toBe(true)
    expect(icons.yandex).toBe(true)
  })

  it('should have version string', () => {
    expect(configuration.version).toBe('1.0')
  })
})
