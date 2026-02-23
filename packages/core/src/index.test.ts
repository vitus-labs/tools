import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const BASE_TMP = path.join(tmpdir(), `vl-core-test-${Date.now()}`)
let testId = 0

const createTestDir = (opts: {
  packageJson?: Record<string, any>
  tsConfig?: Record<string, any>
  vlConfig?: Record<string, any>
  parent?: { vlConfig?: Record<string, any> }
}) => {
  testId++
  const root = path.join(BASE_TMP, `t${testId}`)
  const projectDir = opts.parent ? path.join(root, 'packages', 'child') : root

  mkdirSync(projectDir, { recursive: true })

  writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(opts.packageJson ?? { name: 'test-pkg' }),
  )

  if (opts.tsConfig) {
    writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(opts.tsConfig),
    )
  }

  if (opts.vlConfig) {
    writeFileSync(
      path.join(projectDir, 'vl-tools.config.mjs'),
      `export default ${JSON.stringify(opts.vlConfig)}`,
    )
  }

  if (opts.parent?.vlConfig) {
    writeFileSync(
      path.join(root, 'vl-tools.config.mjs'),
      `export default ${JSON.stringify(opts.parent.vlConfig)}`,
    )
  }

  return projectDir
}

afterAll(() => {
  rmSync(BASE_TMP, { recursive: true, force: true })
})

describe('tools-core', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('swapGlobals', () => {
    it('should invert key/value pairs', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const input = { react: 'React', 'react-dom': 'ReactDOM' }
      expect(mod.swapGlobals(input)).toEqual({
        React: 'react',
        ReactDOM: 'react-dom',
      })
    })

    it('should return empty object for empty input', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.swapGlobals({})).toEqual({})
    })
  })

  describe('defineConfig', () => {
    it('should return the same config object', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const config = { stories: { framework: 'next' } }
      expect(mod.defineConfig(config)).toBe(config)
    })
  })

  describe('findFile', () => {
    it('should return the path when file is found in cwd', async () => {
      vi.resetModules()
      const dir = createTestDir({ tsConfig: { strict: true } })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.findFile('tsconfig.json')).toBe(
        path.join(dir, 'tsconfig.json'),
      )
    })

    it('should walk up directories to find the file', async () => {
      vi.resetModules()
      testId++
      const root = path.join(BASE_TMP, `t${testId}`)
      const child = path.join(root, 'sub', 'deep')
      mkdirSync(child, { recursive: true })
      writeFileSync(
        path.join(child, 'package.json'),
        JSON.stringify({ name: 'deep' }),
      )
      writeFileSync(path.join(root, 'target.json'), '{}')
      vi.spyOn(process, 'cwd').mockReturnValue(child)

      const mod = await import('./index.js')
      expect(mod.findFile('target.json')).toBe(path.join(root, 'target.json'))
    })

    it('should return undefined when file is not found', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.findFile('nonexistent.xyz')).toBeUndefined()
    })
  })

  describe('loadFileToJSON', () => {
    it('should return empty object when file is not found', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.loadFileToJSON('missing.json')).toEqual({})
    })

    it('should parse JSON files', async () => {
      vi.resetModules()
      const dir = createTestDir({
        tsConfig: { compilerOptions: { strict: true } },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.loadFileToJSON('tsconfig.json')).toEqual({
        compilerOptions: { strict: true },
      })
    })

    it('should return empty object for invalid JSON', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      writeFileSync(path.join(dir, 'bad.json'), 'not json{{{')
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.loadFileToJSON('bad.json')).toEqual({})
    })
  })

  describe('loadConfigParam', () => {
    it('should return a function that gets a nested config value', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      writeFileSync(
        path.join(dir, 'config.json'),
        JSON.stringify({ build: { sourceDir: 'src' } }),
      )
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const getParam = mod.loadConfigParam('config.json')
      expect(getParam('build.sourceDir')).toBe('src')
    })

    it('should return defaultValue when key is not found', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      writeFileSync(path.join(dir, 'config.json'), JSON.stringify({}))
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const getParam = mod.loadConfigParam('config.json')
      expect(getParam('missing.key', 'default')).toBe('default')
    })
  })

  describe('loadVLToolsConfig', () => {
    it('should load .mjs config and provide .config, .get(), .merge()', async () => {
      vi.resetModules()
      const dir = createTestDir({
        vlConfig: { build: { sourceDir: 'src' } },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const vlConfig = await mod.loadVLToolsConfig()
      const buildConfig = vlConfig('build')
      expect(buildConfig.config).toEqual({ sourceDir: 'src' })
      expect(buildConfig.get('sourceDir')).toBe('src')
    })

    it('should support chained merge calls', async () => {
      vi.resetModules()
      const dir = createTestDir({
        vlConfig: { build: { sourceDir: 'src' } },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const vlConfig = await mod.loadVLToolsConfig()
      const merged = vlConfig('build').merge({ outputDir: 'lib' })
      expect(merged.config).toEqual({ sourceDir: 'src', outputDir: 'lib' })
    })

    it('should return empty config when no config file exists', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const vlConfig = await mod.loadVLToolsConfig()
      expect(vlConfig('build').config).toEqual({})
    })

    it('should return default value with get when key is missing', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const vlConfig = await mod.loadVLToolsConfig()
      expect(vlConfig('build').get('missing')).toEqual({})
    })

    it('should cascade configs from root to package (deep merge)', async () => {
      vi.resetModules()
      const dir = createTestDir({
        vlConfig: { stories: { framework: 'next' } },
        parent: {
          vlConfig: {
            stories: { framework: 'vite', port: 6006 },
            build: { sourceDir: 'src' },
          },
        },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const vlConfig = await mod.loadVLToolsConfig()
      const stories = vlConfig('stories')

      // framework overridden by package config
      expect(stories.get('framework')).toBe('next')
      // port inherited from root config
      expect(stories.get('port')).toBe(6006)
      // build inherited from root config
      expect(vlConfig('build').config).toEqual({ sourceDir: 'src' })
    })
  })

  describe('module-level constants', () => {
    it('should export PKG with bundleName from scoped package name', async () => {
      vi.resetModules()
      const dir = createTestDir({
        packageJson: {
          name: '@test/pkg',
          version: '1.0.0',
          dependencies: { react: '^19' },
        },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.PKG.name).toBe('@test/pkg')
      expect(mod.PKG.bundleName).toBe('testPkg')
      expect(mod.PKG.externalDependencies).toContain('react')
    })

    it('should handle simple hyphenated package names in bundleName', async () => {
      vi.resetModules()
      const dir = createTestDir({
        packageJson: { name: 'my-cool-library' },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.PKG.bundleName).toBe('myCoolLibrary')
    })

    it('should include peerDependencies in externalDependencies', async () => {
      vi.resetModules()
      const dir = createTestDir({
        packageJson: {
          name: 'my-lib',
          peerDependencies: { 'styled-components': '^6' },
        },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.PKG.externalDependencies).toContain('styled-components')
    })

    it('should export VL_CONFIG as a function', async () => {
      vi.resetModules()
      const dir = createTestDir({})
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(typeof mod.VL_CONFIG).toBe('function')
    })

    it('should export TS_CONFIG from tsconfig.json', async () => {
      vi.resetModules()
      const dir = createTestDir({
        tsConfig: { compilerOptions: { strict: true } },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      expect(mod.TS_CONFIG).toEqual({ compilerOptions: { strict: true } })
    })

    it('should resolve VL_CONFIG from .mjs config at module level', async () => {
      vi.resetModules()
      const dir = createTestDir({
        vlConfig: { stories: { framework: 'next', port: 3000 } },
      })
      vi.spyOn(process, 'cwd').mockReturnValue(dir)

      const mod = await import('./index.js')
      const stories = mod.VL_CONFIG('stories')
      expect(stories.get('framework')).toBe('next')
      expect(stories.get('port')).toBe(3000)
    })
  })
})
