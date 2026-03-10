import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  scaffoldLibrary,
  scaffoldNextjs,
  scaffoldStorybook,
} from './scaffold-package.js'

describe('scaffoldLibrary', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-scaffold-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should create all library project files', () => {
    const files = scaffoldLibrary(dir, '@test/my-lib')

    expect(files).toContain('package.json')
    expect(files).toContain('tsconfig.json')
    expect(files).toContain('biome.json')
    expect(files).toContain('vitest.config.ts')
    expect(files).toContain('vl-tools.config.mjs')
    expect(files).toContain('src/index.ts')

    for (const file of files) {
      expect(existsSync(join(dir, file))).toBe(true)
    }
  })

  it('should set correct package name', () => {
    scaffoldLibrary(dir, '@test/my-lib')
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.name).toBe('@test/my-lib')
    expect(pkg.type).toBe('module')
  })

  it('should include rolldown in scripts', () => {
    scaffoldLibrary(dir, 'test')
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.scripts.build).toBe('vl_rolldown_build')
  })

  it('should extend vitus-labs typescript config', () => {
    scaffoldLibrary(dir, 'test')
    const tsconfig = JSON.parse(
      readFileSync(join(dir, 'tsconfig.json'), 'utf-8'),
    )
    expect(tsconfig.extends).toBe('@vitus-labs/tools-typescript/lib')
  })
})

describe('scaffoldNextjs', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-scaffold-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should create Next.js project files', () => {
    const files = scaffoldNextjs(dir, 'my-app')

    expect(files).toContain('package.json')
    expect(files).toContain('next.config.ts')
    expect(files).toContain('vl-tools.config.mjs')

    for (const file of files) {
      expect(existsSync(join(dir, file))).toBe(true)
    }
  })

  it('should include next dependency', () => {
    scaffoldNextjs(dir, 'my-app')
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies.next).toBeDefined()
    expect(pkg.dependencies['@vitus-labs/tools-nextjs']).toBeDefined()
  })
})

describe('scaffoldStorybook', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-scaffold-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should create Storybook project files', () => {
    const files = scaffoldStorybook(dir, 'my-stories')

    expect(files).toContain('.storybook/main.ts')
    expect(files).toContain('.storybook/preview.ts')

    for (const file of files) {
      expect(existsSync(join(dir, file))).toBe(true)
    }
  })

  it('should include storybook scripts', () => {
    scaffoldStorybook(dir, 'my-stories')
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.scripts.stories).toBe('vl_stories')
  })
})
