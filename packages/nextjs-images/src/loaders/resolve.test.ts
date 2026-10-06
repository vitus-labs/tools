import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { clearDetectedLoadersCache, detectLoaders } from './index.ts'
import { resolveFromProject, resolveOwnLoader } from './resolve.ts'

describe('resolve', () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'resolve-fixture-'))
    for (const name of ['imagemin-mozjpeg', 'webp-loader']) {
      const pkg = path.join(dir, 'node_modules', name)
      mkdirSync(pkg, { recursive: true })
      writeFileSync(
        path.join(pkg, 'package.json'),
        JSON.stringify({ name, main: 'index.js' }),
      )
      writeFileSync(path.join(pkg, 'index.js'), 'module.exports = {}')
    }
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('should resolve modules from the given base directory', () => {
    expect(resolveFromProject('imagemin-mozjpeg', dir)).toContain(
      path.join('node_modules', 'imagemin-mozjpeg', 'index.js'),
    )
  })

  it('should not find modules that are not installed in base or here', () => {
    expect(resolveFromProject('imagemin-mozjpeg')).toBeUndefined()
  })

  it('should fall back to this package own resolution', () => {
    expect(resolveFromProject('url-loader', dir)).toContain('url-loader')
  })

  it('should resolve own loaders to absolute paths', () => {
    for (const name of ['url-loader', 'img-loader', 'raw-loader']) {
      expect(path.isAbsolute(resolveOwnLoader(name))).toBe(true)
    }
  })

  it('should fall back to the bare name for unknown loaders', () => {
    expect(resolveOwnLoader('no-such-loader-xyz')).toBe('no-such-loader-xyz')
  })

  describe('detectLoaders', () => {
    it('should honour overwriteImageLoaderPaths', () => {
      clearDetectedLoadersCache()
      const detected = detectLoaders(dir)

      expect(detected.jpeg).toBe('imagemin-mozjpeg')
      expect(detected.webp).toBe('webp-loader')
      expect(detected.gif).toBe(false)
    })

    it('should memoize per base path', () => {
      clearDetectedLoadersCache()

      expect(detectLoaders(dir)).toBe(detectLoaders(dir))
      expect(detectLoaders(dir)).not.toBe(detectLoaders())
    })
  })
})
