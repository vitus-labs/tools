import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPKG } = vi.hoisted(() => ({
  mockPKG: {
    type: 'commonjs',
    name: '@test/pkg',
    main: 'lib/index.cjs',
    module: 'lib/index.js',
    exports: { import: './lib/index.js', require: './lib/index.cjs' },
  } as Record<string, any>,
}))

vi.mock('../config/index.js', () => ({
  PKG: mockPKG,
  CONFIG: { sourceDir: 'src' },
  PLATFORMS: ['browser', 'node', 'web', 'native'],
}))

describe('createBuildPipeline', () => {
  const defaultPKG = { ...mockPKG }

  beforeEach(() => {
    Object.assign(mockPKG, defaultPKG)
    // Remove any extra keys added by specific tests
    for (const key of Object.keys(mockPKG)) {
      if (!(key in defaultPKG)) delete mockPKG[key]
    }
  })

  describe('with CJS package', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'commonjs'
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should create builds from package.json fields', () => {
      const builds = createBuildPipeline()

      expect(builds.length).toBeGreaterThan(0)
      const mainBuild = builds.find((b) => b.file === 'lib/index.cjs')
      expect(mainBuild).toBeDefined()
      expect(mainBuild.format).toBe('cjs')
    })

    it('should include module build as ES format', () => {
      const builds = createBuildPipeline()

      const moduleBuild = builds.find((b) => b.file === 'lib/index.js')
      expect(moduleBuild).toBeDefined()
      expect(moduleBuild.format).toBe('es')
    })
  })

  describe('with ES module package', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should use ES format for main build', () => {
      const builds = createBuildPipeline()

      const mainBuild = builds.find((b) => b.file === 'lib/index.cjs')
      if (mainBuild) {
        expect(mainBuild.format).toBe('es')
      }
    })

    it('should include exports options', () => {
      const builds = createBuildPipeline()

      expect(builds.length).toBeGreaterThan(0)
    })
  })

  describe('with string exports', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      mockPKG.exports = './lib/index.js'
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should handle string exports', () => {
      const builds = createBuildPipeline()

      const exportBuild = builds.find((b) => b.file === './lib/index.js')
      expect(exportBuild).toBeDefined()
      expect(exportBuild.format).toBe('es')
    })
  })

  describe('with object exports having node field', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      mockPKG.exports = {
        import: './lib/index.js',
        require: './lib/index.cjs',
        node: './lib/node.js',
        default: './lib/default.js',
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should include node export and skip default when import exists', () => {
      const builds = createBuildPipeline()

      const nodeBuild = builds.find((b) => b.file === './lib/node.js')
      expect(nodeBuild).toBeDefined()
      expect(nodeBuild.platform).toBe('node')

      // default is skipped when import is present (avoids duplicate builds)
      const defaultBuild = builds.find((b) => b.file === './lib/default.js')
      expect(defaultBuild).toBeUndefined()
    })
  })

  describe('with no exports', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      delete mockPKG.exports
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should return builds based on main/module fields only', () => {
      const builds = createBuildPipeline()

      expect(builds.length).toBeGreaterThan(0)
    })
  })

  describe('with passthrough exports like package.json', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      delete mockPKG.main
      delete mockPKG.module
      mockPKG.exports = {
        '.': {
          import: './lib/index.js',
        },
        './package.json': './package.json',
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should skip passthrough exports that are not JS files', () => {
      const builds = createBuildPipeline()

      expect(builds).toHaveLength(1)
      expect(builds[0].file).toBe('./lib/index.js')
    })
  })

  describe('with react-native build', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'commonjs'
      mockPKG['react-native'] = 'lib/native.js'
      mockPKG.module = 'lib/index.js'
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should add native build when path differs from module', () => {
      const builds = createBuildPipeline()

      const nativeBuild = builds.find((b) => b.platform === 'native')
      expect(nativeBuild).toBeDefined()
      expect(nativeBuild.file).toBe('lib/native.js')
    })
  })

  describe('with browser-specific builds', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'commonjs'
      mockPKG.main = 'lib/index.cjs'
      mockPKG.module = 'lib/index.js'
      // browser remaps module output — hasDifferentBrowserBuild('main') returns true
      // because source ('lib/index.js') !== PKG['main'] ('lib/index.cjs')
      mockPKG.browser = {
        './lib/index.js': './lib/browser.js',
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should create browser-specific build variants', () => {
      const builds = createBuildPipeline()

      const browserBuild = builds.find((b) => b.platform === 'browser')
      expect(browserBuild).toBeDefined()
      expect(browserBuild.file).toBe('lib/browser.js')
    })

    it('should set node platform for main build when browser variant exists', () => {
      const builds = createBuildPipeline()

      const nodeBuild = builds.find(
        (b) => b.file === 'lib/index.cjs' && b.platform === 'node',
      )
      expect(nodeBuild).toBeDefined()
    })
  })

  describe('with subpath exports', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      delete mockPKG.main
      delete mockPKG.module
      mockPKG.exports = {
        '.': {
          types: './lib/types/index.d.ts',
          import: './lib/index.js',
        },
        './devtools': {
          types: './lib/types/devtools/index.d.ts',
          import: './lib/devtools/index.js',
        },
        './validation/zod': {
          types: './lib/types/validation/zod.d.ts',
          import: './lib/validation/zod.js',
        },
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should create builds for all subpath exports', () => {
      const builds = createBuildPipeline()

      expect(builds).toHaveLength(3)
    })

    it('should set correct input for root export', () => {
      const builds = createBuildPipeline()
      const root = builds.find((b) => b.file === './lib/index.js')

      expect(root).toBeDefined()
      expect(root.input).toBe('src/index.ts')
      expect(root.format).toBe('es')
    })

    it('should set correct input for subpath export', () => {
      const builds = createBuildPipeline()
      const devtools = builds.find((b) => b.file === './lib/devtools/index.js')

      expect(devtools).toBeDefined()
      expect(devtools.input).toBe('src/devtools')
    })

    it('should set correct input for nested subpath export', () => {
      const builds = createBuildPipeline()
      const zod = builds.find((b) => b.file === './lib/validation/zod.js')

      expect(zod).toBeDefined()
      expect(zod.input).toBe('src/validation/zod')
    })
  })

  describe('with subpath exports having multiple conditions', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      delete mockPKG.main
      delete mockPKG.module
      mockPKG.exports = {
        '.': {
          import: './lib/index.js',
          require: './lib/index.cjs',
        },
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should create builds for each condition', () => {
      const builds = createBuildPipeline()

      const esBuild = builds.find((b) => b.file === './lib/index.js')
      expect(esBuild).toBeDefined()
      expect(esBuild.format).toBe('es')

      const cjsBuild = builds.find((b) => b.file === './lib/index.cjs')
      expect(cjsBuild).toBeDefined()
      expect(cjsBuild.format).toBe('cjs')
    })
  })

  describe('with subpath string export', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      delete mockPKG.main
      delete mockPKG.module
      mockPKG.exports = {
        '.': './lib/index.js',
        './utils': './lib/utils.js',
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should handle string subpath exports', () => {
      const builds = createBuildPipeline()

      const root = builds.find((b) => b.file === './lib/index.js')
      expect(root).toBeDefined()
      expect(root.input).toBe('src/index.ts')

      const utils = builds.find((b) => b.file === './lib/utils.js')
      expect(utils).toBeDefined()
      expect(utils.input).toBe('src/utils')
    })
  })

  describe('with UMD builds', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'commonjs'
      mockPKG['umd:main'] = 'lib/index.umd.js'
      mockPKG.unpkg = 'lib/index.umd.min.js'
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should include UMD build variants', () => {
      const builds = createBuildPipeline()

      const umdDev = builds.find((b) => b.file === 'lib/index.umd.js')
      expect(umdDev).toBeDefined()
      expect(umdDev.format).toBe('umd')

      const umdProd = builds.find((b) => b.file === 'lib/index.umd.min.js')
      expect(umdProd).toBeDefined()
      expect(umdProd.env).toBe('production')
    })
  })
})
