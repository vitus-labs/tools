import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUpSync = vi.fn()
vi.mock('find-up', () => ({
  findUpSync: mockFindUpSync,
}))

const mockReadFileSync = vi.fn()
vi.mock('node:fs', () => ({
  default: { readFileSync: mockReadFileSync },
  readFileSync: mockReadFileSync,
}))

const mockRequireFn = vi.fn()
vi.mock('node:module', () => ({
  createRequire: vi.fn(() => mockRequireFn),
}))

// Default mock setup that satisfies module-level getPkgData() —
// package.json must always be found with a valid `name` field,
// otherwise camelspaceBundleName(undefined) crashes at import time.
const setupDefaultMocks = () => {
  mockFindUpSync.mockImplementation((filename: string) => {
    if (filename === 'package.json') return '/mock/package.json'
    return undefined
  })
  mockRequireFn.mockImplementation((path: string) => {
    if (path === '/mock/package.json') return { name: 'mock-pkg' }
    return null
  })
}

describe('tools-core', () => {
  beforeEach(() => {
    mockFindUpSync.mockReset()
    mockReadFileSync.mockReset()
    mockRequireFn.mockReset()
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

  describe('findFile', () => {
    let findFile: (filename: string) => string | undefined

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      findFile = mod.findFile
    })

    it('should call findUpSync with the filename', () => {
      mockFindUpSync.mockReturnValue('/path/to/file.json')
      findFile('file.json')
      expect(mockFindUpSync).toHaveBeenCalledWith('file.json', { type: 'file' })
    })

    it('should return the path when file is found', () => {
      mockFindUpSync.mockReturnValue('/path/to/file.json')
      expect(findFile('file.json')).toBe('/path/to/file.json')
    })

    it('should return undefined when file is not found', () => {
      mockFindUpSync.mockReturnValue(undefined)
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
      mockFindUpSync.mockReturnValue(undefined)
      expect(loadFileToJSON('missing.json')).toEqual({})
    })

    it('should load file using require when available', () => {
      mockFindUpSync.mockReturnValue('/path/to/config.js')
      mockRequireFn.mockReturnValue({ key: 'value' })
      expect(loadFileToJSON('config.js')).toEqual({ key: 'value' })
    })

    it('should return empty object when require returns falsy', () => {
      mockFindUpSync.mockReturnValue('/path/to/config.json')
      mockRequireFn.mockReturnValue(null)
      expect(loadFileToJSON('config.json')).toEqual({})
    })

    it('should return empty object when require throws', () => {
      mockFindUpSync.mockReturnValue('/path/to/bad.json')
      mockRequireFn.mockImplementation(() => {
        throw new Error('require failed')
      })
      expect(loadFileToJSON('bad.json')).toEqual({})
    })
  })

  describe('loadConfigParam', () => {
    let loadConfigParam: (filename: string) => (key: string, defaultValue?: any) => any

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      loadConfigParam = mod.loadConfigParam
    })

    it('should return a function that gets a nested config value', () => {
      mockFindUpSync.mockReturnValue('/path/to/config.js')
      mockRequireFn.mockReturnValue({ build: { sourceDir: 'src' } })
      const getParam = loadConfigParam('config.js')
      expect(getParam('build.sourceDir')).toBe('src')
    })

    it('should return defaultValue when key is not found', () => {
      mockFindUpSync.mockReturnValue('/path/to/config.js')
      mockRequireFn.mockReturnValue({})
      const getParam = loadConfigParam('config.js')
      expect(getParam('missing.key', 'default')).toBe('default')
    })
  })

  describe('loadVLToolsConfig', () => {
    let loadVLToolsConfig: () => (key: string) => any

    beforeEach(async () => {
      vi.resetModules()
      setupDefaultMocks()
      const mod = await import('./index.js')
      loadVLToolsConfig = mod.loadVLToolsConfig
    })

    it('should return a function that provides .config, .get(), .merge()', () => {
      mockFindUpSync.mockReturnValue('/path/to/vl-tools.config.js')
      mockRequireFn.mockReturnValue({ build: { sourceDir: 'src' } })
      const vlConfig = loadVLToolsConfig()
      const buildConfig = vlConfig('build')
      expect(buildConfig.config).toEqual({ sourceDir: 'src' })
      expect(buildConfig.get('sourceDir')).toBe('src')
    })

    it('should support chained merge calls', () => {
      mockFindUpSync.mockReturnValue('/path/to/vl-tools.config.js')
      mockRequireFn.mockReturnValue({ build: { sourceDir: 'src' } })
      const vlConfig = loadVLToolsConfig()
      const merged = vlConfig('build').merge({ outputDir: 'lib' })
      expect(merged.config).toEqual({ sourceDir: 'src', outputDir: 'lib' })
    })

    it('should return empty config when file is not found', () => {
      mockFindUpSync.mockReturnValue(undefined)
      const vlConfig = loadVLToolsConfig()
      const result = vlConfig('build')
      expect(result.config).toEqual({})
    })

    it('should return default value with get when key is missing', () => {
      mockFindUpSync.mockReturnValue(undefined)
      const vlConfig = loadVLToolsConfig()
      const result = vlConfig('build')
      expect(result.get('missing')).toEqual({})
    })
  })

  describe('module-level constants', () => {
    it('should export PKG with bundleName from scoped package name', async () => {
      vi.resetModules()
      mockFindUpSync.mockImplementation((filename: string) => {
        if (filename === 'package.json') return '/path/to/package.json'
        return undefined
      })
      mockRequireFn.mockImplementation((path: string) => {
        if (path === '/path/to/package.json') {
          return { name: '@test/pkg', version: '1.0.0', dependencies: { react: '^19' } }
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
      mockFindUpSync.mockImplementation((filename: string) => {
        if (filename === 'package.json') return '/path/to/package.json'
        return undefined
      })
      mockRequireFn.mockImplementation((path: string) => {
        if (path === '/path/to/package.json') {
          return { name: 'my-cool-library' }
        }
        return null
      })

      const mod = await import('./index.js')
      expect(mod.PKG.bundleName).toBe('myCoolLibrary')
    })

    it('should include peerDependencies in externalDependencies', async () => {
      vi.resetModules()
      mockFindUpSync.mockImplementation((filename: string) => {
        if (filename === 'package.json') return '/path/to/package.json'
        return undefined
      })
      mockRequireFn.mockImplementation((path: string) => {
        if (path === '/path/to/package.json') {
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
      mockFindUpSync.mockImplementation((filename: string) => {
        if (filename === 'package.json') return '/mock/package.json'
        if (filename === 'tsconfig.json') return '/path/to/tsconfig.json'
        return undefined
      })
      mockRequireFn.mockImplementation((path: string) => {
        if (path === '/mock/package.json') return { name: 'mock-pkg' }
        if (path === '/path/to/tsconfig.json') {
          return { compilerOptions: { strict: true } }
        }
        return null
      })

      const mod = await import('./index.js')
      expect(mod.TS_CONFIG).toEqual({ compilerOptions: { strict: true } })
    })
  })
})
