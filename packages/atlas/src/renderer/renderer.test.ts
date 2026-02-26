import { describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('./template', () => ({
  buildHtml: vi.fn(() => '<html>test</html>'),
}))

vi.mock('./report', () => ({
  generateMarkdownReport: vi.fn(() => '# Report'),
  generateJsonReport: vi.fn(() => '{}'),
}))

import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import type { AnalysisData, AtlasConfig } from '../types'
import { renderGraph } from './renderer'

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

const mockData: AnalysisData = {
  graph: { nodes: [], edges: [] },
  cycles: { cycles: [], hasCycles: false },
  impact: { impactMap: {} },
  depth: { depthMap: {}, criticalPath: [], maxDepth: 0 },
  bundleSize: { sizeMap: {} },
  versionDrift: { drifts: [], hasDrifts: false },
  healthScore: { scores: {} },
  changeFrequency: null,
}

describe('renderGraph', () => {
  it('should write HTML file', async () => {
    await renderGraph(mockData, mockConfig)
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('atlas.html'),
      '<html>test</html>',
    )
  })

  it('should write markdown report when configured', async () => {
    await renderGraph(mockData, { ...mockConfig, report: 'markdown' })
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('atlas-report.md'),
      '# Report',
    )
  })

  it('should write JSON report when configured', async () => {
    await renderGraph(mockData, { ...mockConfig, report: 'json' })
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('atlas-report.json'),
      '{}',
    )
  })

  it('should skip report when disabled', async () => {
    vi.mocked(writeFileSync).mockClear()
    await renderGraph(mockData, { ...mockConfig, report: false })
    // Only HTML should be written
    expect(writeFileSync).toHaveBeenCalledTimes(1)
  })

  it('should call execFile to open file when config.open is true', async () => {
    vi.mocked(execFile).mockClear()
    await renderGraph(mockData, { ...mockConfig, open: true })
    expect(execFile).toHaveBeenCalledTimes(1)
    expect(execFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.stringContaining('atlas.html')]),
      expect.any(Function),
    )
  })

  it('should not call execFile when config.open is false', async () => {
    vi.mocked(execFile).mockClear()
    await renderGraph(mockData, { ...mockConfig, open: false })
    expect(execFile).not.toHaveBeenCalled()
  })

  it('should write both markdown and JSON reports when config.report is true', async () => {
    vi.mocked(writeFileSync).mockClear()
    await renderGraph(mockData, { ...mockConfig, report: true })
    // HTML + JSON + Markdown = 3 writes
    expect(writeFileSync).toHaveBeenCalledTimes(3)
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('atlas.html'),
      '<html>test</html>',
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('atlas-report.json'),
      '{}',
    )
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('atlas-report.md'),
      '# Report',
    )
  })

  it('should return htmlPath and reportPath', async () => {
    const result = await renderGraph(mockData, {
      ...mockConfig,
      report: 'markdown',
    })
    expect(result.htmlPath).toContain('atlas.html')
    expect(result.reportPath).toContain('atlas-report.md')
  })

  it('should return reportPath pointing to md when config.report is true', async () => {
    const result = await renderGraph(mockData, {
      ...mockConfig,
      report: true,
    })
    expect(result.htmlPath).toContain('atlas.html')
    // When report=true, both are written; reportPath is the last one assigned (md)
    expect(result.reportPath).toContain('atlas-report.md')
  })

  it('should return undefined reportPath when report is disabled', async () => {
    const result = await renderGraph(mockData, {
      ...mockConfig,
      report: false,
    })
    expect(result.htmlPath).toContain('atlas.html')
    expect(result.reportPath).toBeUndefined()
  })
})
