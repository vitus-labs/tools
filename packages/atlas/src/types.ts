export type DepType = 'dependencies' | 'devDependencies' | 'peerDependencies'

export interface DepNode {
  name: string
  version: string
  path: string
  private: boolean
}

export interface DepEdge {
  source: string
  target: string
  depType: DepType
}

export interface DepGraph {
  nodes: DepNode[]
  edges: DepEdge[]
}

export interface CycleResult {
  cycles: string[][]
  hasCycles: boolean
}

export interface ImpactResult {
  impactMap: Record<string, string[]>
}

export interface DepthResult {
  depthMap: Record<string, number>
  criticalPath: string[]
  maxDepth: number
}

export interface BundleSizeResult {
  sizeMap: Record<string, { libSize: number; transitiveSize: number }>
}

export interface VersionDriftResult {
  drifts: { dependency: string; versions: Record<string, string[]> }[]
  hasDrifts: boolean
}

export interface HealthScoreResult {
  scores: Record<string, { score: number; factors: string[] }>
}

export interface ChangeFrequencyResult {
  frequencyMap: Record<string, { commits: number; lastChanged: string }>
  hotspots: string[]
}

export interface AnalysisData {
  graph: DepGraph
  cycles: CycleResult
  impact: ImpactResult
  depth: DepthResult
  bundleSize: BundleSizeResult
  versionDrift: VersionDriftResult
  healthScore: HealthScoreResult
  changeFrequency: ChangeFrequencyResult | null
}

export interface AtlasConfig {
  workspaces: string[]
  depTypes: DepType[]
  include: string[]
  exclude: string[]
  outputPath: string
  echartsCdn: string
  open: boolean
  title: string
  report: boolean | 'json' | 'markdown'
}
