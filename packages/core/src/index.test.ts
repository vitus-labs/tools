import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStatSync = vi.fn()
const mockReadFileSync = vi.fn()
vi.mock('node:fs', () => ({
  default: {
    statSync: mockStatSync,
    readFileSync: mockReadFileSync,
  },
  statSync: mockStatSync,
  readFileSync: mockReadFileSync,
}))

const mockRequireFn = vi.fn()
vi.mock('node:module', () => ({
  createRequire: vi.fn(() => mockRequireFn),
}))

// Helper: make specific paths "exist" for findFileUp
const makeFilesExist = (paths: string[]) => {
  mockStatSync.mockImplementation((filePath: string) => {
    if (paths.includes(filePath)) return { isFile: () => true }
    throw new Error('ENOENT')
  })
}

// Default mock setup that satisfies module-level getPkgData() —
// package.json must always be found with a valid `name` field,
// otherwise camelspaceBundleName(undefined) crashes at import time.
const setupDefaultMocks = () => {
  vi.spyOn(process, 'cwd').mockReturnValue('/mock/project')
  makeFilesExist(['/mock/project/package.json'])
  mockRequireFn.mockImplementation((p: string) => {
    if (p === '/mock/project/package.json') return { name: 'mock-pkg' }
    return null
  })
}

describe('tools-core', () => {
  beforeEach(() => {
    mockStatSync.mockReset()
    mockReadFileSync.mockReset()
    mockRequireFn.mockReset()
    vi.restoreAllMocks()
  })

  describe('swapGlobals', () => {
    let swapGlobals: (globals: Record<string, string>) => Record<string, string>

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      swapGlobals = mod.swapGlobals
    })

    it('should invert key/value pairs', () => {
      const input = { react: 'React', 'react-dom': 'ReactDOM' }
      const result = swapGlobals(input)
      expect(result).toEqual({ React: 'react', ReactDOM: 'react-dom' })
    })

    it('should return empty object for empty input', () => {
      expect(swapGlobals({})).toEqual({})
    })
  })

  describe('defineConfig', () => {
    let defineConfig: <T extends Record<string, any>>(config: T) => T

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      defineConfig = mod.defineConfig
    })

    it('should return the same config object', () => {
      const config = { stories: { framework: 'next' } }
      expect(defineConfig(config)).toBe(config)
    })
  })

  describe('findFile', () => {
    let findFile: (filename: string) => string | undefined

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      findFile = mod.findFile
    })

    it('should return the path when file is found in cwd', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/some.json'])
      expect(findFile('some.json')).toBe('/mock/project/some.json')
    })

    it('should walk up directories to find the file', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/some.json'])
      expect(findFile('some.json')).toBe('/mock/some.json')
    })

    it('should return undefined when file is not found', () => {
      expect(findFile('missing.json')).toBeUndefined()
    })
  })

  describe('loadFileToJSON', () => {
    let loadFileToJSON: (filename: string) => Record<string, any>

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      loadFileToJSON = mod.loadFileToJSON
    })

    it('should return empty object when file is not found', () => {
      expect(loadFileToJSON('missing.json')).toEqual({})
    })

    it('should load file using require when available', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/config.js'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/config.js') return { key: 'value' }
        return null
      })
      expect(loadFileToJSON('config.js')).toEqual({ key: 'value' })
    })

    it('should unwrap ESM default export', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/config.mjs'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/config.mjs')
          return { default: { key: 'value' } }
        return null
      })
      expect(loadFileToJSON('config.mjs')).toEqual({ key: 'value' })
    })

    it('should fall back to JSON.parse when require returns empty', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/data.json'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/data.json') throw new Error('require failed')
        return null
      })
      mockReadFileSync.mockReturnValue('{"parsed": true}')
      expect(loadFileToJSON('data.json')).toEqual({ parsed: true })
    })

    it('should return empty object when require throws', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/bad.json'])
      mockRequireFn.mockImplementation(() => {
        throw new Error('require failed')
      })
      mockReadFileSync.mockImplementation(() => {
        throw new Error('read failed')
      })
      expect(loadFileToJSON('bad.json')).toEqual({})
    })
  })

  describe('loadConfigParam', () => {
    let loadConfigParam: (
      filename: string,
    ) => (key: string, defaultValue?: any) => any

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      loadConfigParam = mod.loadConfigParam
    })

    it('should return a function that gets a nested config value', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/config.js'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/config.js')
          return { build: { sourceDir: 'src' } }
        return null
      })
      const getParam = loadConfigParam('config.js')
      expect(getParam('build.sourceDir')).toBe('src')
    })

    it('should return defaultValue when key is not found', () => {
      makeFilesExist(['/mock/project/package.json', '/mock/project/config.js'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/config.js') return {}
        return null
      })
      const getParam = loadConfigParam('config.js')
      expect(getParam('missing.key', 'default')).toBe('default')
    })
  })

  describe('loadVLToolsConfig', () => {
    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
    })

    it('should return a function that provides .config, .get(), .merge()', async () => {
      makeFilesExist([
        '/mock/project/package.json',
        '/mock/project/vl-tools.config.js',
      ])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/package.json') return { name: 'mock-pkg' }
        if (p === '/mock/project/vl-tools.config.js')
          return { build: { sourceDir: 'src' } }
        return null
      })

      const mod = await import('./index.js')
      const vlConfig = mod.loadVLToolsConfig()
      const buildConfig = vlConfig('build')
      expect(buildConfig.config).toEqual({ sourceDir: 'src' })
      expect(buildConfig.get('sourceDir')).toBe('src')
    })

    it('should support chained merge calls', async () => {
      makeFilesExist([
        '/mock/project/package.json',
        '/mock/project/vl-tools.config.js',
      ])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/package.json') return { name: 'mock-pkg' }
        if (p === '/mock/project/vl-tools.config.js')
          return { build: { sourceDir: 'src' } }
        return null
      })

      const mod = await import('./index.js')
      const vlConfig = mod.loadVLToolsConfig()
      const merged = vlConfig('build').merge({ outputDir: 'lib' })
      expect(merged.config).toEqual({ sourceDir: 'src', outputDir: 'lib' })
    })

    it('should return empty config when file is not found', async () => {
      const mod = await import('./index.js')
      const vlConfig = mod.loadVLToolsConfig()
      const result = vlConfig('build')
      expect(result.config).toEqual({})
    })

    it('should return default value with get when key is missing', async () => {
      const mod = await import('./index.js')
      const vlConfig = mod.loadVLToolsConfig()
      const result = vlConfig('build')
      expect(result.get('missing')).toEqual({})
    })

    it('should prefer .mjs over .js config files', async () => {
      makeFilesExist([
        '/mock/project/package.json',
        '/mock/project/vl-tools.config.mjs',
        '/mock/project/vl-tools.config.js',
      ])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/package.json') return { name: 'mock-pkg' }
        if (p === '/mock/project/vl-tools.config.mjs')
          return { build: { sourceDir: 'mjs-src' } }
        if (p === '/mock/project/vl-tools.config.js')
          return { build: { sourceDir: 'js-src' } }
        return null
      })

      const mod = await import('./index.js')
      const vlConfig = mod.loadVLToolsConfig()
      expect(vlConfig('build').config).toEqual({ sourceDir: 'mjs-src' })
    })

    it('should cascade configs from root to package (deep merge)', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/mock/packages/ui')
      makeFilesExist([
        '/mock/packages/ui/package.json',
        '/mock/vl-tools.config.js',
        '/mock/packages/ui/vl-tools.config.js',
      ])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/packages/ui/package.json') return { name: 'mock-pkg' }
        // Root config: base settings
        if (p === '/mock/vl-tools.config.js')
          return {
            stories: { framework: 'vite', port: 6006 },
            build: { sourceDir: 'src' },
          }
        // Package config: override framework only
        if (p === '/mock/packages/ui/vl-tools.config.js')
          return { stories: { framework: 'next' } }
        return null
      })

      const mod = await import('./index.js')
      const vlConfig = mod.loadVLToolsConfig()
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
      vi.spyOn(process, 'cwd').mockReturnValue('/path/to')
      makeFilesExist(['/path/to/package.json'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/path/to/package.json') {
          return {
            name: '@test/pkg',
            version: '1.0.0',
            dependencies: { react: '^19' },
          }
        }
        return null
      })

      const mod = await import('./index.js')
      expect(mod.PKG.name).toBe('@test/pkg')
      expect(mod.PKG.bundleName).toBe('testPkg')
      expect(mod.PKG.externalDependencies).toContain('react')
    })

    it('should handle simple hyphenated package names in bundleName', async () => {
      vi.resetModules()
      vi.spyOn(process, 'cwd').mockReturnValue('/path/to')
      makeFilesExist(['/path/to/package.json'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/path/to/package.json') {
          return { name: 'my-cool-library' }
        }
        return null
      })

      const mod = await import('./index.js')
      expect(mod.PKG.bundleName).toBe('myCoolLibrary')
    })

    it('should include peerDependencies in externalDependencies', async () => {
      vi.resetModules()
      vi.spyOn(process, 'cwd').mockReturnValue('/path/to')
      makeFilesExist(['/path/to/package.json'])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/path/to/package.json') {
          return {
            name: 'my-lib',
            peerDependencies: { 'styled-components': '^6' },
          }
        }
        return null
      })

      const mod = await import('./index.js')
      expect(mod.PKG.externalDependencies).toContain('styled-components')
    })

    it('should export VL_CONFIG as a function', async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      expect(typeof mod.VL_CONFIG).toBe('function')
    })

    it('should export TS_CONFIG from tsconfig.json', async () => {
      vi.resetModules()
      vi.spyOn(process, 'cwd').mockReturnValue('/mock/project')
      makeFilesExist([
        '/mock/project/package.json',
        '/mock/project/tsconfig.json',
      ])
      mockRequireFn.mockImplementation((p: string) => {
        if (p === '/mock/project/package.json') return { name: 'mock-pkg' }
        if (p === '/mock/project/tsconfig.json') {
          return { compilerOptions: { strict: true } }
        }
        return null
      })

      const mod = await import('./index.js')
      expect(mod.TS_CONFIG).toEqual({ compilerOptions: { strict: true } })
    })
  })
})
