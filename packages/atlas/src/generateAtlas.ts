import {
  analyzeBundleSize,
  analyzeChangeFrequency,
  analyzeDepth,
  analyzeImpact,
  computeHealthScores,
  detectCycles,
  detectVersionDrift,
} from './analysis'
import { renderGraph } from './renderer/renderer'
import { scanWorkspace } from './scanner/scanner'
import type { AnalysisData, AtlasConfig } from './types'

export const generateAtlas = async (
  config: AtlasConfig,
): Promise<{ htmlPath: string; reportPath?: string }> => {
  const graph = scanWorkspace(config)

  console.log(
    `Atlas: found ${graph.nodes.length} packages, ${graph.edges.length} edges`,
  )

  const cycles = detectCycles(graph)
  const impact = analyzeImpact(graph)
  const depth = analyzeDepth(graph, cycles)
  const bundleSize = analyzeBundleSize(graph)
  const versionDrift = detectVersionDrift(graph)
  const changeFrequency = analyzeChangeFrequency(graph, impact)
  const healthScore = computeHealthScores({
    graph,
    cycles,
    impact,
    depth,
    versionDrift,
    changeFrequency,
  })

  if (cycles.hasCycles) {
    console.log(
      `Atlas: ${cycles.cycles.length} circular dependency cycle(s) detected`,
    )
  }

  console.log(`Atlas: max dependency depth: ${depth.maxDepth}`)

  if (depth.criticalPath.length > 0) {
    console.log(`Atlas: critical path: ${depth.criticalPath.join(' -> ')}`)
  }

  const data: AnalysisData = {
    graph,
    cycles,
    impact,
    depth,
    bundleSize,
    versionDrift,
    healthScore,
    changeFrequency,
  }

  const result = await renderGraph(data, config)

  console.log(`Atlas: written ${result.htmlPath}`)
  if (result.reportPath) {
    console.log(`Atlas: report ${result.reportPath}`)
  }

  return result
}
