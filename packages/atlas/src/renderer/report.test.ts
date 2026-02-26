import { describe, expect, it } from 'vitest'
import type { AnalysisData } from '../types'
import { generateJsonReport, generateMarkdownReport } from './report'

const mockData: AnalysisData = {
  graph: {
    nodes: [
      { name: '@s/a', version: '1.0.0', path: '/a', private: false },
      { name: '@s/b', version: '1.0.0', path: '/b', private: false },
      { name: '@s/c', version: '1.0.0', path: '/c', private: false },
    ],
    edges: [
      { source: '@s/a', target: '@s/b', depType: 'dependencies' },
      { source: '@s/b', target: '@s/c', depType: 'peerDependencies' },
    ],
  },
  cycles: { cycles: [], hasCycles: false },
  impact: {
    impactMap: { '@s/a': [], '@s/b': ['@s/a'], '@s/c': ['@s/a', '@s/b'] },
  },
  depth: {
    depthMap: { '@s/a': 2, '@s/b': 1, '@s/c': 0 },
    criticalPath: ['@s/a', '@s/b', '@s/c'],
    maxDepth: 2,
  },
  bundleSize: {
    sizeMap: {
      '@s/a': { libSize: 1000, transitiveSize: 3000 },
      '@s/b': { libSize: 1500, transitiveSize: 2000 },
      '@s/c': { libSize: 500, transitiveSize: 500 },
    },
  },
  versionDrift: { drifts: [], hasDrifts: false },
  healthScore: {
    scores: {
      '@s/a': { score: 85, factors: ['healthy'] },
      '@s/b': { score: 90, factors: ['healthy'] },
      '@s/c': { score: 95, factors: ['healthy'] },
    },
  },
  changeFrequency: null,
}

/** Rich mock data that exercises cycles, drift, deep chains, orphans, hotspots */
const richMockData: AnalysisData = {
  graph: {
    nodes: [
      { name: '@s/a', version: '1.0.0', path: '/a', private: false },
      { name: '@s/b', version: '1.0.0', path: '/b', private: false },
      { name: '@s/c', version: '1.0.0', path: '/c', private: false },
      { name: '@s/d', version: '1.0.0', path: '/d', private: false },
      { name: '@s/orphan', version: '1.0.0', path: '/orphan', private: false },
    ],
    edges: [
      { source: '@s/a', target: '@s/b', depType: 'dependencies' },
      { source: '@s/b', target: '@s/a', depType: 'dependencies' },
      { source: '@s/c', target: '@s/d', depType: 'devDependencies' },
    ],
  },
  cycles: {
    cycles: [['@s/a', '@s/b']],
    hasCycles: true,
  },
  impact: {
    impactMap: {
      '@s/a': ['@s/b'],
      '@s/b': ['@s/a'],
      '@s/c': [],
      '@s/d': ['@s/c'],
      '@s/orphan': [],
    },
  },
  depth: {
    depthMap: { '@s/a': 5, '@s/b': 4, '@s/c': 1, '@s/d': 0, '@s/orphan': 0 },
    criticalPath: ['@s/a', '@s/b'],
    maxDepth: 5,
  },
  bundleSize: {
    sizeMap: {
      '@s/a': { libSize: 2048, transitiveSize: 8192 },
      '@s/b': { libSize: 1024, transitiveSize: 4096 },
      '@s/c': { libSize: 0, transitiveSize: 0 },
      '@s/d': { libSize: 512, transitiveSize: 512 },
      '@s/orphan': { libSize: 0, transitiveSize: 0 },
    },
  },
  versionDrift: {
    drifts: [
      {
        dependency: 'lodash',
        versions: { '4.17.21': ['@s/a'], '4.17.20': ['@s/b'] },
      },
      {
        dependency: 'react',
        versions: { '18.2.0': ['@s/a', '@s/c'], '18.3.0': ['@s/b'] },
      },
    ],
    hasDrifts: true,
  },
  healthScore: {
    scores: {
      '@s/a': { score: 45, factors: ['in 1 cycle(s)', 'deep chain (depth 5)'] },
      '@s/b': { score: 55, factors: ['in 1 cycle(s)', 'deep chain (depth 4)'] },
      '@s/c': { score: 85, factors: ['no dependents (orphan)'] },
      '@s/d': { score: 95, factors: ['healthy'] },
      '@s/orphan': {
        score: 70,
        factors: ['no dependents (orphan)'],
      },
    },
  },
  changeFrequency: {
    frequencyMap: {
      '@s/a': { commits: 25, lastChanged: '2025-01-15' },
      '@s/b': { commits: 12, lastChanged: '2025-01-10' },
      '@s/c': { commits: 0, lastChanged: '2024-06-01' },
      '@s/d': { commits: 3, lastChanged: '2025-01-05' },
      '@s/orphan': { commits: 0, lastChanged: '2024-01-01' },
    },
    hotspots: ['@s/a', '@s/b'],
  },
}

describe('generateMarkdownReport', () => {
  it('should include title', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).toContain('# Atlas')
  })

  it('should include summary stats', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).toContain('3 packages')
    expect(md).toContain('2 dependencies')
  })

  it('should include critical path', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).toContain('@s/a -> @s/b -> @s/c')
  })

  it('should include health scores table', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).toContain('Health Scores')
    expect(md).toContain('@s/a')
  })

  it('should include dep type distribution', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).toContain('Production: 1')
    expect(md).toContain('Peer: 1')
  })

  it('should render cycles section when cycles exist', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## Circular Dependencies')
    expect(md).toContain('`@s/a`')
    expect(md).toContain('`@s/b`')
    expect(md).toContain('Suggestion:')
    expect(md).toContain('Extract shared')
  })

  it('should include cycle count in summary when cycles exist', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('1 circular dependency cycle(s) detected')
  })

  it('should not render cycles section when no cycles', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).not.toContain('## Circular Dependencies')
  })

  it('should render version drift table when drifts exist', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## Version Drift')
    expect(md).toContain('lodash')
    expect(md).toContain('4.17.21')
    expect(md).toContain('4.17.20')
    expect(md).toContain('react')
    expect(md).toContain('18.2.0')
    expect(md).toContain('18.3.0')
  })

  it('should not render version drift section when no drifts', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).not.toContain('## Version Drift')
  })

  it('should render bundle size table when packages have non-zero sizes', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## Bundle Size')
    expect(md).toContain('@s/a')
    expect(md).toContain('KB')
  })

  it('should render bundle size for base mock data with non-zero sizes', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).toContain('## Bundle Size')
    expect(md).toContain('Own size')
    expect(md).toContain('Transitive size')
  })

  it('should not render bundle size section when all sizes are zero', () => {
    const zeroBundleData: AnalysisData = {
      ...mockData,
      bundleSize: {
        sizeMap: {
          '@s/a': { libSize: 0, transitiveSize: 0 },
          '@s/b': { libSize: 0, transitiveSize: 0 },
          '@s/c': { libSize: 0, transitiveSize: 0 },
        },
      },
    }
    const md = generateMarkdownReport(zeroBundleData)
    expect(md).not.toContain('## Bundle Size')
  })

  it('should render deep chains section when depth > 3', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## Deeply Nested Chains')
    expect(md).toContain('Depth 5')
    expect(md).toContain('Depth 4')
    expect(md).toContain('flattening')
  })

  it('should not render deep chains section when no deep chains', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).not.toContain('## Deeply Nested Chains')
  })

  it('should render orphan packages section', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## Packages With No Dependents')
    // @s/c and @s/orphan are not targets of any edge
    expect(md).toContain('@s/c')
    expect(md).toContain('@s/orphan')
  })

  it('should render hotspots section when hotspots exist', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## Change Frequency Hotspots')
    expect(md).toContain('**@s/a**')
    expect(md).toContain('25 commits')
    expect(md).toContain('**@s/b**')
    expect(md).toContain('12 commits')
    expect(md).toContain('Risk:')
  })

  it('should not render hotspots section when no hotspots', () => {
    const md = generateMarkdownReport(mockData)
    expect(md).not.toContain('## Change Frequency Hotspots')
  })

  it('should include high-impact packages table', () => {
    const md = generateMarkdownReport(richMockData)
    expect(md).toContain('## High-Impact Packages')
    expect(md).toContain('Direct deps')
    expect(md).toContain('Transitive dependents')
  })
})

describe('generateJsonReport', () => {
  it('should produce valid JSON', () => {
    const json = generateJsonReport(mockData)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('should include summary', () => {
    const report = JSON.parse(generateJsonReport(mockData))
    expect(report.summary.packages).toBe(3)
    expect(report.summary.edges).toBe(2)
  })

  it('should include health scores', () => {
    const report = JSON.parse(generateJsonReport(mockData))
    expect(report.healthScores).toHaveLength(3)
  })

  it('should include cycles in JSON when cycles exist', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.cycles).toHaveLength(1)
    expect(report.cycles[0].cycle).toContain('@s/a')
    expect(report.cycles[0].suggestion).toBeDefined()
  })

  it('should include version drift data in JSON', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.versionDrift).toHaveLength(2)
    expect(report.versionDrift[0].dependency).toBe('lodash')
    expect(report.versionDrift[0].suggestion).toContain('lodash')
  })

  it('should include bundle size data in JSON', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.bundleSize.length).toBeGreaterThan(0)
    const pkgA = report.bundleSize.find(
      (b: { name: string }) => b.name === '@s/a',
    )
    expect(pkgA?.ownSize).toBe(2048)
    expect(pkgA?.transitiveSize).toBe(8192)
  })

  it('should include deep chains in JSON', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.deepChains.length).toBeGreaterThan(0)
    expect(report.deepChains[0].depth).toBeGreaterThan(3)
    expect(report.deepChains[0].suggestion).toContain('flattening')
  })

  it('should include orphan packages in JSON', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.orphans).toContain('@s/orphan')
  })

  it('should include hotspots in JSON', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.hotspots).toHaveLength(2)
    expect(report.hotspots[0].name).toBe('@s/a')
    expect(report.hotspots[0].commits).toBe(25)
    expect(report.hotspots[0].dependents).toBe(1)
  })

  it('should include dep type distribution in JSON', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    expect(report.depTypeDistribution.dependencies).toBe(2)
    expect(report.depTypeDistribution.devDependencies).toBe(1)
  })

  it('should sort health scores by score ascending', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    const scores = report.healthScores.map((h: { score: number }) => h.score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1])
    }
  })

  it('should sort bundle sizes by transitive size descending', () => {
    const report = JSON.parse(generateJsonReport(richMockData))
    const sizes = report.bundleSize.map(
      (b: { transitiveSize: number }) => b.transitiveSize,
    )
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1])
    }
  })
})
