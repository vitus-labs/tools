import { describe, expect, it } from 'vitest'
import baseConfig from '../config/baseConfig.ts'
import type { AnalysisData, AtlasConfig } from '../types.ts'
import { buildHtml } from './template.ts'

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

describe('buildHtml — escaping and SRI', () => {
  it('HTML-escapes the title', () => {
    const html = buildHtml(mockData, {
      ...mockConfig,
      title: '<script>alert(1)</script> & "x"',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;',
    )
  })

  it('does not let a package name break out of the data script', () => {
    const evil = '</script><img src=x onerror=alert(1)>'
    const data: AnalysisData = {
      ...mockData,
      graph: {
        nodes: [{ name: evil, version: '1.0.0', path: '/x', private: false }],
        edges: [],
      },
    }
    const html = buildHtml(data, mockConfig)
    expect(html).not.toContain(evil)
    expect(html).toContain('\\u003c/script>')
  })

  it('emits the SRI hash only for the default echarts URL', () => {
    const custom = buildHtml(mockData, mockConfig)
    expect(custom).not.toContain('integrity=')
    const def = buildHtml(mockData, {
      ...mockConfig,
      echartsCdn: baseConfig.echartsCdn,
    })
    expect(def).toContain('integrity="sha384-')
  })
})
