import { describe, expect, it } from 'vitest'
import lqipExportLoader from './lqip-export-loader.js'

describe('lqipExportLoader', () => {
  it('should re-export preSrc property', () => {
    const content = Buffer.from(
      'module.exports = { preSrc: "data:image/jpeg;base64,abc", palette: ["#fff"] }',
    )

    const result = lqipExportLoader.call(
      { getOptions: () => ({ exportProperty: 'preSrc' }) } as any,
      content,
    )

    expect(result).toContain('var lqip =')
    expect(result).toContain('module.exports = lqip.preSrc')
    expect(result).toContain('Object.assign(module.exports, lqip)')
    expect(result).not.toContain('module.exports = {')
  })

  it('should re-export palette property', () => {
    const content = Buffer.from(
      'module.exports = { preSrc: "base64...", palette: ["#000", "#fff"] }',
    )

    const result = lqipExportLoader.call(
      { getOptions: () => ({ exportProperty: 'palette' }) } as any,
      content,
    )

    expect(result).toContain('module.exports = lqip.palette')
  })

  it('should only replace the first module.exports', () => {
    const content = Buffer.from(
      'module.exports = { a: 1 }; // module.exports was here',
    )

    const result = lqipExportLoader.call(
      { getOptions: () => ({ exportProperty: 'a' }) } as any,
      content,
    )

    // First occurrence replaced, rest untouched
    expect(result).toMatch(/^var lqip = \{ a: 1 \}/)
  })
})
