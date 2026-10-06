import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VERSIONS } from '../versions.ts'
import { scaffoldLibrary } from './scaffold-package.ts'

describe('scaffold safety', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-scaffold-safe-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should not overwrite existing files and should report them as skipped', () => {
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'src', 'index.ts'), 'export const mine = 1\n')
    writeFileSync(join(dir, 'tsconfig.json'), '{"mine": true}')

    const result = scaffoldLibrary(dir, 'test')

    expect(result.skipped).toEqual(
      expect.arrayContaining(['src/index.ts', 'tsconfig.json']),
    )
    expect(result.created).not.toContain('src/index.ts')
    expect(readFileSync(join(dir, 'src', 'index.ts'), 'utf-8')).toBe(
      'export const mine = 1\n',
    )
    expect(readFileSync(join(dir, 'tsconfig.json'), 'utf-8')).toBe(
      '{"mine": true}',
    )
  })

  it('should generate valid TypeScript for names containing quotes', () => {
    scaffoldLibrary(dir, 'it\'s "quoted" \\ name')
    const src = readFileSync(join(dir, 'src', 'index.ts'), 'utf-8')
    const literal = src.slice(src.indexOf('=> ') + 3).trim()
    expect(JSON.parse(literal)).toBe('Hello from it\'s "quoted" \\ name!')
  })

  it('should not set the TS 6 deprecated baseUrl', () => {
    scaffoldLibrary(dir, 'test')
    const tsconfig = JSON.parse(
      readFileSync(join(dir, 'tsconfig.json'), 'utf-8'),
    )
    expect(tsconfig.compilerOptions.baseUrl).toBeUndefined()
  })

  it('should scaffold current dependency versions', () => {
    scaffoldLibrary(dir, 'test')
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.devDependencies.typescript).toBe(VERSIONS.typescript)
    expect(pkg.devDependencies.vitest).toBe(VERSIONS.vitest)
    expect(pkg.devDependencies.vite).toBe(VERSIONS.vite)
    expect(pkg.devDependencies['@biomejs/biome']).toBe(VERSIONS.biome)
    expect(pkg.devDependencies['@vitus-labs/tools-rolldown']).toBe(
      VERSIONS.vitusLabs,
    )
    expect(JSON.stringify(pkg)).not.toContain('latest')
  })
})
