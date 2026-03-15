import type {
  ChangeFrequencyResult,
  CycleResult,
  DepGraph,
  DepthResult,
  HealthScoreResult,
  ImpactResult,
  VersionDriftResult,
} from '../types.js'

interface HealthInput {
  graph: DepGraph
  cycles: CycleResult
  impact: ImpactResult
  depth: DepthResult
  versionDrift: VersionDriftResult
  changeFrequency: ChangeFrequencyResult | null
}

const collectCyclePackages = (cycles: CycleResult): Set<string> => {
  const cyclePackages = new Set<string>()
  for (const cycle of cycles.cycles) {
    for (const pkg of cycle) {
      cyclePackages.add(pkg)
    }
  }
  return cyclePackages
}

const collectDriftPackages = (
  versionDrift: VersionDriftResult,
): Map<string, number> => {
  const driftPackages = new Map<string, number>()
  for (const drift of versionDrift.drifts) {
    for (const packages of Object.values(drift.versions)) {
      for (const pkg of packages) {
        driftPackages.set(pkg, (driftPackages.get(pkg) ?? 0) + 1)
      }
    }
  }
  return driftPackages
}

const collectDependentSet = (graph: DepGraph): Set<string> => {
  const hasDependent = new Set<string>()
  for (const edge of graph.edges) {
    hasDependent.add(edge.target)
  }
  return hasDependent
}

const applyCyclePenalty = (
  name: string,
  cycles: CycleResult,
  cyclePackages: Set<string>,
): { penalty: number; factor: string | null } => {
  if (!cyclePackages.has(name)) return { penalty: 0, factor: null }
  const cycleCount = cycles.cycles.filter((c) => c.includes(name)).length
  const penalty = Math.min(cycleCount * 20, 40)
  return { penalty, factor: `in ${cycleCount} cycle(s)` }
}

const applyOrphanPenalty = (
  name: string,
  hasDependent: Set<string>,
  nodeCount: number,
): { penalty: number; factor: string | null } => {
  if (!hasDependent.has(name) && nodeCount > 1) {
    return { penalty: 15, factor: 'no dependents (orphan)' }
  }
  return { penalty: 0, factor: null }
}

const applyDepthPenalty = (
  name: string,
  depth: DepthResult,
): { penalty: number; factor: string | null } => {
  const nodeDepth = depth.depthMap[name] ?? 0
  if (nodeDepth > 3) {
    return { penalty: 10, factor: `deep chain (depth ${nodeDepth})` }
  }
  return { penalty: 0, factor: null }
}

const applyDriftPenalty = (
  name: string,
  driftPackages: Map<string, number>,
): { penalty: number; factor: string | null } => {
  const driftCount = driftPackages.get(name) ?? 0
  if (driftCount > 0) {
    const penalty = Math.min(driftCount * 5, 20)
    return { penalty, factor: `${driftCount} version drift(s)` }
  }
  return { penalty: 0, factor: null }
}

const applyBonuses = (
  name: string,
  score: number,
  impact: ImpactResult,
  changeFrequency: ChangeFrequencyResult | null,
): number => {
  let result = score
  const dependentCount = (impact.impactMap[name] ?? []).length
  if (dependentCount > 0) {
    const bonus = Math.min(dependentCount * 5, 20)
    result = Math.min(result + bonus, 100)
  }

  if (changeFrequency) {
    const freq = changeFrequency.frequencyMap[name]
    if (freq && freq.commits > 0) {
      result = Math.min(result + 5, 100)
    }
  }

  return result
}

export const computeHealthScores = (input: HealthInput): HealthScoreResult => {
  const { graph, cycles, impact, depth, versionDrift, changeFrequency } = input

  const cyclePackages = collectCyclePackages(cycles)
  const driftPackages = collectDriftPackages(versionDrift)
  const hasDependent = collectDependentSet(graph)

  const scores: HealthScoreResult['scores'] = {}

  for (const node of graph.nodes) {
    let score = 100
    const factors: string[] = []

    const penalties = [
      applyCyclePenalty(node.name, cycles, cyclePackages),
      applyOrphanPenalty(node.name, hasDependent, graph.nodes.length),
      applyDepthPenalty(node.name, depth),
      applyDriftPenalty(node.name, driftPackages),
    ]

    for (const { penalty, factor } of penalties) {
      score -= penalty
      if (factor) factors.push(factor)
    }

    score = applyBonuses(node.name, score, impact, changeFrequency)

    scores[node.name] = {
      score: Math.max(0, Math.min(100, score)),
      factors: factors.length > 0 ? factors : ['healthy'],
    }
  }

  return { scores }
}
