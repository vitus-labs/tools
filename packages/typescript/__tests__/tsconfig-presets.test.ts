import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const loadJson = (filename: string) => {
  const filePath = resolve(import.meta.dirname, '..', filename)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

describe('lib.json', () => {
  const config = loadJson('lib.json')

  it('should have a valid $schema', () => {
    expect(config.$schema).toMatch(/tsconfig/)
  })

  it('should target ES2024', () => {
    expect(config.compilerOptions.target).toBe('ES2024')
  })

  it('should use module Preserve', () => {
    expect(config.compilerOptions.module).toBe('Preserve')
  })

  it('should use Bundler module resolution (best practice for bundled libs)', () => {
    expect(config.compilerOptions.moduleResolution).toBe('Bundler')
  })

  it('should include dom in lib (browser/SSR libs)', () => {
    expect(config.compilerOptions.lib).toContain('dom')
  })

  it('should have strict mode enabled', () => {
    expect(config.compilerOptions.strict).toBe(true)
  })

  it('should include src directory', () => {
    expect(config.include).toContain('src')
  })

  it('should enable declaration and sourceMap', () => {
    expect(config.compilerOptions.declaration).toBe(true)
    expect(config.compilerOptions.sourceMap).toBe(true)
  })
})

describe('node.json', () => {
  const config = loadJson('node.json')

  it('should have a valid $schema', () => {
    expect(config.$schema).toMatch(/tsconfig/)
  })

  it('should use module NodeNext', () => {
    expect(config.compilerOptions.module).toBe('NodeNext')
  })

  it('should use NodeNext module resolution', () => {
    expect(config.compilerOptions.moduleResolution).toBe('NodeNext')
  })

  it('should rewrite relative import extensions on emit', () => {
    expect(config.compilerOptions.rewriteRelativeImportExtensions).toBe(true)
  })

  it('should not include dom in lib (server-only)', () => {
    expect(config.compilerOptions.lib).toEqual(['ES2024'])
  })

  it('should not configure jsx (server-only)', () => {
    expect(config.compilerOptions.jsx).toBeUndefined()
  })

  it('should not allow JS interop (TS-only)', () => {
    expect(config.compilerOptions.allowJs).toBeUndefined()
  })

  it('should include node types', () => {
    expect(config.compilerOptions.types).toEqual(['node'])
  })

  it('should have strict mode enabled', () => {
    expect(config.compilerOptions.strict).toBe(true)
  })
})

describe('nextjs.json', () => {
  const config = loadJson('nextjs.json')

  it('should have a valid $schema', () => {
    expect(config.$schema).toMatch(/tsconfig/)
  })

  it('should use ESNext module', () => {
    expect(config.compilerOptions.module).toBe('ESNext')
  })

  it('should have jsx set to preserve', () => {
    expect(config.compilerOptions.jsx).toBe('preserve')
  })

  it('should have strict mode enabled', () => {
    expect(config.compilerOptions.strict).toBe(true)
  })

  it('should have incremental builds enabled', () => {
    expect(config.compilerOptions.incremental).toBe(true)
  })
})
