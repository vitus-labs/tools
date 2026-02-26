import { describe, expect, it } from 'vitest'
import type { AnalysisData, AtlasConfig } from '../types'
import { buildHtml } from './template'

const mockConfig: AtlasConfig = {
  workspaces: ['packages/*'],
  depTypes: ['dependencies'],
  include: [],
  exclude: [],
  outputPath: './atlas.html',
  echartsCdn: 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js',
  open: false,
  title: 'Test Atlas',
  report: false,
}

const mockData: AnalysisData = {
  graph: {
    nodes: [
      { name: '@s/a', version: '1.0.0', path: '/a', private: false },
      { name: '@s/b', version: '1.0.0', path: '/b', private: false },
    ],
    edges: [{ source: '@s/a', target: '@s/b', depType: 'dependencies' }],
  },
  cycles: { cycles: [], hasCycles: false },
  impact: { impactMap: { '@s/a': [], '@s/b': ['@s/a'] } },
  depth: {
    depthMap: { '@s/a': 1, '@s/b': 0 },
    criticalPath: ['@s/a', '@s/b'],
    maxDepth: 1,
  },
  bundleSize: {
    sizeMap: {
      '@s/a': { libSize: 0, transitiveSize: 0 },
      '@s/b': { libSize: 0, transitiveSize: 0 },
    },
  },
  versionDrift: { drifts: [], hasDrifts: false },
  healthScore: {
    scores: {
      '@s/a': { score: 90, factors: ['healthy'] },
      '@s/b': { score: 95, factors: ['healthy'] },
    },
  },
  changeFrequency: null,
}

describe('buildHtml', () => {
  it('should include ECharts CDN script', () => {
    const html = buildHtml(mockData, mockConfig)
    expect(html).toContain(mockConfig.echartsCdn)
  })

  it('should embed graph data', () => {
    const html = buildHtml(mockData, mockConfig)
    expect(html).toContain('GRAPH_DATA')
  })

  it('should include the title', () => {
    const html = buildHtml(mockData, mockConfig)
    expect(html).toContain('Test Atlas')
  })

  it('should include chart type buttons', () => {
    const html = buildHtml(mockData, mockConfig)
    expect(html).toContain('Force')
    expect(html).toContain('Tree')
    expect(html).toContain('Matrix')
  })

  it('should produce valid HTML structure', () => {
    const html = buildHtml(mockData, mockConfig)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})
