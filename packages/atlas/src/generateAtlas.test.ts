import { describe, expect, it, vi } from 'vitest'

vi.mock('./scanner/scanner', () => ({
  scanWorkspace: vi.fn(() => ({
    nodes: [
      { name: '@s/a', version: '1.0.0', path: '/a', private: false },
      { name: '@s/b', version: '1.0.0', path: '/b', private: false },
    ],
    edges: [{ source: '@s/a', target: '@s/b', depType: 'dependencies' }],
  })),
}))

vi.mock('./analysis', () => ({
  detectCycles: vi.fn(() => ({ cycles: [], hasCycles: false })),
  analyzeImpact: vi.fn(() => ({ impactMap: { '@s/a': [], '@s/b': ['@s/a'] } })),
  analyzeDepth: vi.fn(() => ({
    depthMap: { '@s/a': 1, '@s/b': 0 },
    criticalPath: ['@s/a', '@s/b'],
    maxDepth: 1,
  })),
  analyzeBundleSize: vi.fn(() => ({
    sizeMap: {
      '@s/a': { libSize: 0, transitiveSize: 0 },
      '@s/b': { libSize: 0, transitiveSize: 0 },
    },
  })),
  detectVersionDrift: vi.fn(() => ({ drifts: [], hasDrifts: false })),
  computeHealthScores: vi.fn(() => ({
    scores: {
      '@s/a': { score: 90, factors: ['healthy'] },
      '@s/b': { score: 95, factors: ['healthy'] },
    },
  })),
  analyzeChangeFrequency: vi.fn(() => null),
}))

vi.mock('./renderer/renderer', () => ({
  renderGraph: vi.fn(() =>
    Promise.resolve({
      htmlPath: '/out/atlas.html',
      reportPath: '/out/atlas-report.md',
    }),
  ),
}))

import { analyzeDepth, analyzeImpact, detectCycles } from './analysis'
import { generateAtlas } from './generateAtlas'
import { renderGraph } from './renderer/renderer'
import { scanWorkspace } from './scanner/scanner'
import type { AtlasConfig } from './types'

const mockConfig: AtlasConfig = {
  workspaces: ['packages/*'],
  depTypes: ['dependencies'],
  include: [],
  exclude: [],
  outputPath: './atlas.html',
  echartsCdn: '',
  open: false,
  title: 'Test',
  report: 'markdown',
}

describe('generateAtlas', () => {
  it('should scan workspace with provided config', async () => {
    await generateAtlas(mockConfig)
    expect(scanWorkspace).toHaveBeenCalledWith(mockConfig)
  })

  it('should run all analysis steps', async () => {
    await generateAtlas(mockConfig)
    expect(detectCycles).toHaveBeenCalled()
    expect(analyzeImpact).toHaveBeenCalled()
    expect(analyzeDepth).toHaveBeenCalled()
  })

  it('should call renderGraph with analysis data and config', async () => {
    await generateAtlas(mockConfig)
    expect(renderGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: expect.objectContaining({ nodes: expect.any(Array) }),
        cycles: expect.objectContaining({ hasCycles: false }),
      }),
      mockConfig,
    )
  })

  it('should return html and report paths', async () => {
    const result = await generateAtlas(mockConfig)
    expect(result.htmlPath).toBe('/out/atlas.html')
    expect(result.reportPath).toBe('/out/atlas-report.md')
  })
})
