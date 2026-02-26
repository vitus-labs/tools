import type {
  ChangeFrequencyResult,
  CycleResult,
  DepGraph,
  DepthResult,
  HealthScoreResult,
  ImpactResult,
  VersionDriftResult,
} from '../types'

interface HealthInput {
  graph: DepGraph
  cycles: CycleResult
  impact: ImpactResult
  depth: DepthResult
  versionDrift: VersionDriftResult
  changeFrequency: ChangeFrequencyResult | null
}

export const computeHealthScores = (input: HealthInput): HealthScoreResult => {
  const { graph, cycles, impact, depth, versionDrift, changeFrequency } = input

  // Build set of packages involved in cycles
  const cyclePackages = new Set<string>()
  for (const cycle of cycles.cycles) {
    for (const pkg of cycle) {
      cyclePackages.add(pkg)
    }
  }

  // Build map of packages with version drift
  const driftPackages = new Map<string, number>()
  for (const drift of versionDrift.drifts) {
    for (const packages of Object.values(drift.versions)) {
      for (const pkg of packages) {
        driftPackages.set(pkg, (driftPackages.get(pkg) ?? 0) + 1)
      }
    }
  }

  // Find packages with no dependents (orphans)
  const hasDependent = new Set<string>()
  for (const edge of graph.edges) {
    hasDependent.add(edge.target)
  }

  const scores: HealthScoreResult['scores'] = {}

  for (const node of graph.nodes) {
    let score = 100
    const factors: string[] = []

    // Cycle involvement: -20 per cycle
    if (cyclePackages.has(node.name)) {
      const cycleCount = cycles.cycles.filter((c) =>
        c.includes(node.name),
      ).length
      const penalty = Math.min(cycleCount * 20, 40)
      score -= penalty
      factors.push(`in ${cycleCount} cycle(s)`)
    }

    // Orphan: -15
    if (!hasDependent.has(node.name) && graph.nodes.length > 1) {
      score -= 15
      factors.push('no dependents (orphan)')
    }

    // Deep chain: -10 if depth > 3
    const nodeDepth = depth.depthMap[node.name] ?? 0
    if (nodeDepth > 3) {
      score -= 10
      factors.push(`deep chain (depth ${nodeDepth})`)
    }

    // Version drift: -5 per drifted dep
    const driftCount = driftPackages.get(node.name) ?? 0
    if (driftCount > 0) {
      const penalty = Math.min(driftCount * 5, 20)
      score -= penalty
      factors.push(`${driftCount} version drift(s)`)
    }

    // Has dependents bonus: +5 per dependent (capped at 20)
    const dependentCount = (impact.impactMap[node.name] ?? []).length
    if (dependentCount > 0) {
      const bonus = Math.min(dependentCount * 5, 20)
      score = Math.min(score + bonus, 100)
    }

    // Recently changed bonus: +5
    if (changeFrequency) {
      const freq = changeFrequency.frequencyMap[node.name]
      if (freq && freq.commits > 0) {
        score = Math.min(score + 5, 100)
      }
    }

    scores[node.name] = {
      score: Math.max(0, Math.min(100, score)),
      factors: factors.length > 0 ? factors : ['healthy'],
    }
  }

  return { scores }
}
