import { describe, expect, it } from 'vitest'
import { runtimeGenerator } from './svg-runtime-generator.js'

const mockContext = {
  context: '/project/src',
  rootContext: '/project',
  utils: {
    contextify: (_ctx: string, request: string) =>
      `./${request.split('/').pop()}`,
  },
}

describe('runtimeGenerator', () => {
  it('should generate component code with replaced placeholders', () => {
    const result = runtimeGenerator({
      symbol: { id: 'icon-home', viewBox: '0 0 24 24', content: '<path/>' },
      config: {
        spriteModule:
          '/project/node_modules/svg-sprite-loader/runtime/sprite.js',
        symbolModule:
          '/project/node_modules/svg-sprite-loader/runtime/symbol.js',
      },
      context: mockContext,
    })

    expect(result).toContain("import { createElement } from 'react'")
    expect(result).toContain('import sprite from')
    expect(result).toContain('import SpriteSymbol from')
    expect(result).toContain('new SpriteSymbol(')
    expect(result).toContain('"id":"icon-home"')
    expect(result).toContain('"viewBox":"0 0 24 24"')
    expect(result).toContain('export default SvgSpriteIcon')
  })

  it('should use contextify to stringify requests', () => {
    const result = runtimeGenerator({
      symbol: { id: 'test' },
      config: {
        spriteModule: '/absolute/path/to/sprite.js',
        symbolModule: '/absolute/path/to/symbol.js',
      },
      context: mockContext,
    })

    // contextify mock returns relative paths
    expect(result).toContain('"./sprite.js"')
    expect(result).toContain('"./symbol.js"')
  })

  it('should contain React createElement calls', () => {
    const result = runtimeGenerator({
      symbol: { id: 'icon' },
      config: {
        spriteModule: 'sprite',
        symbolModule: 'symbol',
      },
      context: mockContext,
    })

    expect(result).toContain("createElement(\n    'svg'")
    expect(result).toContain("createElement('use'")
    expect(result).toContain('xlinkHref')
  })
})
