import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const configPath = resolve(import.meta.dirname, '..', 'biome.shared.json')
const config = JSON.parse(readFileSync(configPath, 'utf-8'))

describe('biome.shared.json', () => {
  it('should have a valid $schema pointing to biomejs.dev', () => {
    expect(config.$schema).toMatch(/biomejs\.dev/)
  })

  it('should have formatter enabled', () => {
    expect(config.formatter.enabled).toBe(true)
  })

  it('should have linter enabled with recommended rules', () => {
    expect(config.linter.enabled).toBe(true)
    expect(config.linter.rules.recommended).toBe(true)
  })

  it('should have javascript formatter with single quotes and no semicolons', () => {
    expect(config.javascript.formatter.quoteStyle).toBe('single')
    expect(config.javascript.formatter.semicolons).toBe('asNeeded')
  })

  it('should define global variables for vitus-labs build system', () => {
    expect(config.javascript.globals).toContain('__BROWSER__')
    expect(config.javascript.globals).toContain('__NODE__')
    expect(config.javascript.globals).toContain('__VERSION__')
  })

  it('should have css linter enabled', () => {
    expect(config.css.linter.enabled).toBe(true)
  })
})
