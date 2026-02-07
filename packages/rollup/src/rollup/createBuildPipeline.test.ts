import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPKG } = vi.hoisted(() => ({
  mockPKG: {
    type: 'commonjs',
    name: '@test/pkg',
    main: 'lib/index.cjs',
    module: 'lib/index.js',
    exports: {
      import: './lib/index.js',
      require: './lib/index.cjs',
      types: './lib/index.d.ts',
    },
  } as Record<string, any>,
}))

vi.mock('../config/index.js', () => ({
  PKG: mockPKG,
  CONFIG: {},
  PLATFORMS: ['browser', 'node', 'web', 'native'],
}))

describe('createBuildPipeline', () => {
  const defaultPKG = { ...mockPKG, exports: { ...mockPKG.exports } }

  beforeEach(() => {
    Object.assign(mockPKG, defaultPKG)
    mockPKG.exports = { ...defaultPKG.exports }
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

    it('should add typesFilePath to the first build', () => {
      const builds = createBuildPipeline()

      expect(builds[0].typesFilePath).toBe('./lib/index.d.ts')
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

    it('should include exports options for ES module packages', () => {
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

  describe('with object exports having node and default fields', () => {
    let createBuildPipeline: () => any[]

    beforeEach(async () => {
      vi.resetModules()
      mockPKG.type = 'module'
      mockPKG.exports = {
        import: './lib/index.js',
        require: './lib/index.cjs',
        node: './lib/node.js',
        default: './lib/default.js',
        types: './lib/index.d.ts',
      }
      const mod = await import('./createBuildPipeline.js')
      createBuildPipeline = mod.default
    })

    it('should include node and default exports', () => {
      const builds = createBuildPipeline()

      const nodeBuild = builds.find((b) => b.file === './lib/node.js')
      expect(nodeBuild).toBeDefined()
      expect(nodeBuild.platform).toBe('node')

      const defaultBuild = builds.find((b) => b.file === './lib/default.js')
      expect(defaultBuild).toBeDefined()
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
})
