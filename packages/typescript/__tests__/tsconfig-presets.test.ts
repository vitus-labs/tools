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

  it('should use module NodeNext', () => {
    expect(config.compilerOptions.module).toBe('NodeNext')
  })

  it('should use NodeNext module resolution', () => {
    expect(config.compilerOptions.moduleResolution).toBe('NodeNext')
  })

  it('should rewrite relative import extensions on emit', () => {
    expect(config.compilerOptions.rewriteRelativeImportExtensions).toBe(true)
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
