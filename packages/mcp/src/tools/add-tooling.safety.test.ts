import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VERSIONS } from '../versions.ts'
import { applyToolAction, formatResult, getToolActions } from './add-tooling.ts'

describe('applyToolAction (existing project safety)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-add-safe-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should not downgrade or overwrite existing dependency versions', () => {
    const pkg: Record<string, unknown> = {
      name: 'test',
      devDependencies: { typescript: '^7.0.0', vitest: '^5.0.0' },
    }

    const result = applyToolAction(pkg, dir, getToolActions('vitest'))

    const devDeps = pkg.devDependencies as Record<string, string>
    expect(devDeps.vitest).toBe('^5.0.0')
    expect(devDeps.typescript).toBe('^7.0.0')
    expect(result.skipped.deps).toContain('vitest')
    expect(result.addedDeps).not.toContain('vitest')
    expect(devDeps['@vitus-labs/tools-vitest']).toBe(VERSIONS.vitusLabs)
  })

  it('should not add a dependency already declared in another section', () => {
    const pkg: Record<string, unknown> = {
      name: 'test',
      dependencies: { '@vitus-labs/tools-nextjs': '^1.0.0' },
    }

    applyToolAction(pkg, dir, {
      devDependencies: { '@vitus-labs/tools-nextjs': VERSIONS.vitusLabs },
    })

    expect(pkg.devDependencies).toBeUndefined()
  })

  it('should not clobber existing scripts', () => {
    const pkg: Record<string, unknown> = {
      name: 'test',
      scripts: { build: 'custom-build', test: 'jest' },
    }

    const result = applyToolAction(pkg, dir, {
      scripts: { build: 'vl_rolldown_build', dev: 'vl_rolldown_build-watch' },
    })

    const scripts = pkg.scripts as Record<string, string>
    expect(scripts.build).toBe('custom-build')
    expect(scripts.dev).toBe('vl_rolldown_build-watch')
    expect(result.skipped.scripts).toEqual(['build'])
    expect(result.addedScripts).toEqual(['dev'])
  })

  it('should report skipped files', () => {
    writeFileSync(join(dir, 'biome.json'), '{}')
    const result = applyToolAction({}, dir, {
      files: [{ path: 'biome.json', content: 'x' }],
    })
    expect(result.skipped.files).toEqual(['biome.json'])
  })

  it('should use current dependency ranges', () => {
    const ts = getToolActions('typescript').devDependencies
    expect(ts?.typescript).toBe(VERSIONS.typescript)
    expect(ts?.typescript).toBe('^6.0.3')
    expect(getToolActions('vitest').devDependencies?.vitest).toBe(
      VERSIONS.vitest,
    )
    expect(getToolActions('lint').devDependencies?.['@biomejs/biome']).toBe(
      VERSIONS.biome,
    )
  })

  it('should not say "Added" when nothing changed', () => {
    const text = formatResult(['lint'], [], [], [], {
      deps: ['@biomejs/biome'],
      scripts: ['lint'],
      files: ['biome.json'],
    })
    expect(text).not.toContain('Added tools')
    expect(text).toContain('No changes made')
    expect(text).toContain('Skipped')
    expect(text).toContain('@biomejs/biome')
    expect(text).not.toContain('bun install')
  })
})
