import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyToolAction, formatResult, getToolActions } from './add-tooling.js'

describe('getToolActions', () => {
  it('should return devDependencies for typescript tool', () => {
    const actions = getToolActions('typescript')
    expect(actions.devDependencies).toBeDefined()
    expect(actions.devDependencies?.['@vitus-labs/tools-typescript']).toBe(
      'latest',
    )
  })

  it('should return scripts for lint tool', () => {
    const actions = getToolActions('lint')
    expect(actions.scripts?.lint).toBe('biome check .')
    expect(actions.scripts?.format).toBe('biome format --write .')
  })

  it('should return dependencies (not devDependencies) for nextjs tool', () => {
    const actions = getToolActions('nextjs')
    expect(actions.dependencies?.['@vitus-labs/tools-nextjs']).toBe('latest')
    expect(actions.devDependencies).toBeUndefined()
  })

  it('should return file configs for vitest tool', () => {
    const actions = getToolActions('vitest')
    expect(actions.files).toBeDefined()
    expect(actions.files?.[0]?.path).toBe('vitest.config.ts')
  })

  it('should return all 10 tools without errors', () => {
    const tools = [
      'typescript',
      'lint',
      'vitest',
      'rolldown',
      'rollup',
      'nextjs',
      'nextjs-images',
      'storybook',
      'favicon',
      'atlas',
    ] as const

    for (const tool of tools) {
      expect(() => getToolActions(tool)).not.toThrow()
    }
  })
})

describe('applyToolAction', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-add-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should merge dependencies into package.json', () => {
    const pkg: Record<string, unknown> = {
      name: 'test',
      dependencies: { react: '^19.0.0' },
    }

    const result = applyToolAction(pkg, dir, {
      dependencies: { '@vitus-labs/tools-nextjs': 'latest' },
    })

    const deps = pkg.dependencies as Record<string, string>
    expect(deps.react).toBe('^19.0.0')
    expect(deps['@vitus-labs/tools-nextjs']).toBe('latest')
    expect(result.addedDeps).toContain('@vitus-labs/tools-nextjs')
  })

  it('should merge devDependencies into package.json', () => {
    const pkg: Record<string, unknown> = { name: 'test' }

    applyToolAction(pkg, dir, {
      devDependencies: { '@vitus-labs/tools-lint': 'latest' },
    })

    const devDeps = pkg.devDependencies as Record<string, string>
    expect(devDeps['@vitus-labs/tools-lint']).toBe('latest')
  })

  it('should merge scripts into package.json', () => {
    const pkg: Record<string, unknown> = {
      name: 'test',
      scripts: { dev: 'next dev' },
    }

    applyToolAction(pkg, dir, { scripts: { build: 'next build' } })

    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.dev).toBe('next dev')
    expect(scripts.build).toBe('next build')
  })

  it('should create config files that do not exist', () => {
    const pkg: Record<string, unknown> = { name: 'test' }

    const result = applyToolAction(pkg, dir, {
      files: [{ path: 'biome.json', content: '{}' }],
    })

    expect(result.createdFiles).toContain('biome.json')
    expect(readFileSync(join(dir, 'biome.json'), 'utf-8')).toBe('{}')
  })

  it('should not overwrite existing config files', () => {
    writeFileSync(join(dir, 'biome.json'), '{"existing": true}')
    const pkg: Record<string, unknown> = { name: 'test' }

    const result = applyToolAction(pkg, dir, {
      files: [{ path: 'biome.json', content: '{"new": true}' }],
    })

    expect(result.createdFiles).toHaveLength(0)
    expect(readFileSync(join(dir, 'biome.json'), 'utf-8')).toBe(
      '{"existing": true}',
    )
  })
})

describe('formatResult', () => {
  it('should format a complete result', () => {
    const result = formatResult(
      ['typescript', 'lint'],
      ['@vitus-labs/tools-typescript', '@vitus-labs/tools-lint'],
      ['lint', 'format'],
      ['tsconfig.json', 'biome.json'],
    )

    expect(result).toContain('Added tools: typescript, lint')
    expect(result).toContain('@vitus-labs/tools-typescript')
    expect(result).toContain('lint, format')
    expect(result).toContain('tsconfig.json')
    expect(result).toContain('bun install')
  })

  it('should omit empty sections', () => {
    const result = formatResult(
      ['rolldown'],
      ['@vitus-labs/tools-rolldown'],
      ['build', 'dev'],
      [],
    )

    expect(result).toContain('Added tools: rolldown')
    expect(result).not.toContain('Created files')
  })
})
