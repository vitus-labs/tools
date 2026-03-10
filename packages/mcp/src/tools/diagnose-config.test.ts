import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { diagnose } from './diagnose-config.js'

describe('diagnose', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should report error when no package.json exists', () => {
    const issues = diagnose(dir)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('error')
    expect(issues[0]?.message).toContain('No package.json')
  })

  it('should report error for invalid JSON', () => {
    writeFileSync(join(dir, 'package.json'), 'not json')
    const issues = diagnose(dir)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('error')
    expect(issues[0]?.message).toContain('not valid JSON')
  })

  it('should warn about missing "type": "module"', () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test' }))
    const issues = diagnose(dir)
    const esm = issues.find((i) => i.message.includes('"type": "module"'))
    expect(esm).toBeDefined()
    expect(esm?.severity).toBe('warning')
  })

  it('should warn about missing tsconfig', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', type: 'module' }),
    )
    const issues = diagnose(dir)
    const ts = issues.find((i) => i.message.includes('tsconfig'))
    expect(ts).toBeDefined()
    expect(ts?.severity).toBe('warning')
  })

  it('should warn about missing biome config', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', type: 'module' }),
    )
    const issues = diagnose(dir)
    const biome = issues.find((i) => i.message.includes('Biome'))
    expect(biome).toBeDefined()
  })

  it('should detect ESLint config as info', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', type: 'module' }),
    )
    writeFileSync(join(dir, '.eslintrc.json'), '{}')
    const issues = diagnose(dir)
    const eslint = issues.find((i) => i.message.includes('ESLint'))
    expect(eslint).toBeDefined()
    expect(eslint?.severity).toBe('info')
  })

  it('should detect missing .js extensions in imports', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', type: 'module' }),
    )
    mkdirSync(join(dir, 'src'))
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      "import { foo } from './utils'\n",
    )
    const issues = diagnose(dir)
    const ext = issues.find((i) => i.message.includes('.js extension'))
    expect(ext).toBeDefined()
    expect(ext?.severity).toBe('error')
  })

  it('should not flag imports with .js extensions', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', type: 'module' }),
    )
    mkdirSync(join(dir, 'src'))
    writeFileSync(
      join(dir, 'src', 'index.ts'),
      "import { foo } from './utils.js'\n",
    )
    const issues = diagnose(dir)
    const ext = issues.find((i) => i.message.includes('.js extension'))
    expect(ext).toBeUndefined()
  })

  it('should detect missing script dependencies', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'test',
        type: 'module',
        scripts: { build: 'vl_rolldown_build' },
      }),
    )
    const issues = diagnose(dir)
    const dep = issues.find((i) =>
      i.message.includes('@vitus-labs/tools-rolldown'),
    )
    expect(dep).toBeDefined()
    expect(dep?.severity).toBe('error')
  })

  it('should detect missing exports.types', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'test',
        type: 'module',
        exports: { '.': { import: './lib/index.js' } },
      }),
    )
    const issues = diagnose(dir)
    const types = issues.find((i) => i.message.includes('exports["."].types'))
    expect(types).toBeDefined()
    expect(types?.severity).toBe('warning')
  })

  it('should report no issues for well-configured project', () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'test',
        type: 'module',
        exports: {
          '.': { import: './lib/index.js', types: './lib/types/index.d.ts' },
        },
      }),
    )
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ extends: '@vitus-labs/tools-typescript/lib' }),
    )
    writeFileSync(
      join(dir, 'biome.json'),
      JSON.stringify({ extends: ['@vitus-labs/tools-lint/biome'] }),
    )
    writeFileSync(join(dir, 'vl-tools.config.mjs'), 'export default {}')

    const issues = diagnose(dir)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('No issues found')
  })
})
