import type { AnalysisData, DepType } from '../types'

interface ReportJson {
  summary: {
    packages: number
    edges: number
    cycles: number
    maxDepth: number
  }
  cycles: { cycle: string[]; suggestion: string }[]
  highImpact: {
    name: string
    directDeps: number
    transitiveDependents: number
  }[]
  deepChains: { path: string[]; depth: number; suggestion: string }[]
  orphans: string[]
  depTypeDistribution: Record<DepType, number>
  versionDrift: {
    dependency: string
    versions: Record<string, string[]>
    suggestion: string
  }[]
  bundleSize: { name: string; ownSize: number; transitiveSize: number }[]
  healthScores: { name: string; score: number; factors: string[] }[]
  hotspots: { name: string; commits: number; dependents: number }[]
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`
}

const buildReportData = (data: AnalysisData): ReportJson => {
  const {
    graph,
    cycles,
    impact,
    depth,
    bundleSize,
    versionDrift,
    healthScore,
    changeFrequency,
  } = data

  // Dep type distribution
  const depTypeDistribution: Record<DepType, number> = {
    dependencies: 0,
    devDependencies: 0,
    peerDependencies: 0,
  }
  for (const edge of graph.edges) {
    depTypeDistribution[edge.depType]++
  }

  // Direct dep count per package
  const directDeps = new Map<string, number>()
  for (const edge of graph.edges) {
    directDeps.set(edge.source, (directDeps.get(edge.source) ?? 0) + 1)
  }

  // High impact packages (sorted by transitive dependents desc)
  const highImpact = Object.entries(impact.impactMap)
    .map(([name, dependents]) => ({
      name,
      directDeps: directDeps.get(name) ?? 0,
      transitiveDependents: dependents.length,
    }))
    .filter((p) => p.transitiveDependents > 0)
    .sort((a, b) => b.transitiveDependents - a.transitiveDependents)

  // Deep chains (packages with depth > 3)
  const deepChains = Object.entries(depth.depthMap)
    .filter(([, d]) => d > 3)
    .sort(([, a], [, b]) => b - a)
    .map(([name, d]) => ({
      path: [name],
      depth: d,
      suggestion:
        'Consider flattening by adding a direct dependency to reduce chain length.',
    }))

  // Orphans
  const hasDependent = new Set<string>()
  for (const edge of graph.edges) {
    hasDependent.add(edge.target)
  }
  const orphans = graph.nodes
    .filter((n) => !hasDependent.has(n.name))
    .map((n) => n.name)
    .sort()

  // Hotspots
  const hotspots = (changeFrequency?.hotspots ?? []).map((name) => ({
    name,
    commits: changeFrequency?.frequencyMap[name]?.commits ?? 0,
    dependents: (impact.impactMap[name] ?? []).length,
  }))

  return {
    summary: {
      packages: graph.nodes.length,
      edges: graph.edges.length,
      cycles: cycles.cycles.length,
      maxDepth: depth.maxDepth,
    },
    cycles: cycles.cycles.map((cycle) => ({
      cycle,
      suggestion:
        'Extract shared types/interfaces into a separate package to break this cycle.',
    })),
    highImpact,
    deepChains,
    orphans,
    depTypeDistribution,
    versionDrift: versionDrift.drifts.map((d) => ({
      ...d,
      suggestion: `Align all packages to the same version of ${d.dependency}.`,
    })),
    bundleSize: Object.entries(bundleSize.sizeMap)
      .map(([name, sizes]) => ({
        name,
        ownSize: sizes.libSize,
        transitiveSize: sizes.transitiveSize,
      }))
      .sort((a, b) => b.transitiveSize - a.transitiveSize),
    healthScores: Object.entries(healthScore.scores)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.score - b.score),
    hotspots,
  }
}

export const generateJsonReport = (data: AnalysisData): string =>
  JSON.stringify(buildReportData(data), null, 2)

export const generateMarkdownReport = (data: AnalysisData): string => {
  const report = buildReportData(data)
  const lines: string[] = []

  lines.push('# Atlas — Dependency Analysis Report')
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push(
    `- ${report.summary.packages} packages, ${report.summary.edges} dependencies`,
  )
  if (report.summary.cycles > 0) {
    lines.push(
      `- ${report.summary.cycles} circular dependency cycle(s) detected`,
    )
  }
  lines.push(`- Max dependency depth: ${report.summary.maxDepth}`)
  if (data.depth.criticalPath.length > 0) {
    lines.push(`- Critical path: ${data.depth.criticalPath.join(' -> ')}`)
  }
  lines.push('')

  // Circular Dependencies
  if (report.cycles.length > 0) {
    lines.push('## Circular Dependencies')
    for (const c of report.cycles) {
      lines.push(`1. \`${c.cycle.join('` -> `')}\` -> \`${c.cycle[0]}\``)
      lines.push(`   **Suggestion:** ${c.suggestion}`)
    }
    lines.push('')
  }

  // High-Impact Packages
  if (report.highImpact.length > 0) {
    lines.push('## High-Impact Packages')
    lines.push('| Package | Direct deps | Transitive dependents |')
    lines.push('| --- | --- | --- |')
    for (const p of report.highImpact.slice(0, 15)) {
      lines.push(`| ${p.name} | ${p.directDeps} | ${p.transitiveDependents} |`)
    }
    lines.push('')
  }

  // Deep Chains
  if (report.deepChains.length > 0) {
    lines.push('## Deeply Nested Chains')
    for (const c of report.deepChains) {
      lines.push(`- Depth ${c.depth}: ${c.path.join(' -> ')}`)
      lines.push(`  **Suggestion:** ${c.suggestion}`)
    }
    lines.push('')
  }

  // Dependency Type Distribution
  lines.push('## Dependency Type Distribution')
  lines.push(`- Production: ${report.depTypeDistribution.dependencies} edges`)
  lines.push(`- Peer: ${report.depTypeDistribution.peerDependencies} edges`)
  lines.push(`- Dev: ${report.depTypeDistribution.devDependencies} edges`)
  lines.push('')

  // Orphans
  if (report.orphans.length > 0) {
    lines.push('## Packages With No Dependents')
    for (const o of report.orphans) {
      lines.push(`- ${o}`)
    }
    lines.push('')
  }

  // Version Drift
  if (report.versionDrift.length > 0) {
    lines.push('## Version Drift')
    lines.push('| Dependency | Versions | Packages |')
    lines.push('| --- | --- | --- |')
    for (const d of report.versionDrift) {
      const versions = Object.keys(d.versions).join(', ')
      const packages = Object.entries(d.versions)
        .map(([v, pkgs]) => pkgs.map((p) => `${p} (${v})`).join(', '))
        .join(', ')
      lines.push(`| ${d.dependency} | ${versions} | ${packages} |`)
    }
    lines.push('')
  }

  // Bundle Size
  if (report.bundleSize.some((b) => b.ownSize > 0)) {
    lines.push('## Bundle Size')
    lines.push('| Package | Own size | Transitive size |')
    lines.push('| --- | --- | --- |')
    for (const b of report.bundleSize.filter((b) => b.ownSize > 0)) {
      lines.push(
        `| ${b.name} | ${formatBytes(b.ownSize)} | ${formatBytes(b.transitiveSize)} |`,
      )
    }
    lines.push('')
  }

  // Health Scores
  lines.push('## Health Scores')
  lines.push('| Package | Score | Issues |')
  lines.push('| --- | --- | --- |')
  for (const h of report.healthScores) {
    lines.push(`| ${h.name} | ${h.score} | ${h.factors.join(', ')} |`)
  }
  lines.push('')

  // Hotspots
  if (report.hotspots.length > 0) {
    lines.push('## Change Frequency Hotspots')
    for (const h of report.hotspots) {
      lines.push(
        `- **${h.name}**: ${h.commits} commits in 90 days, ${h.dependents} transitive dependents`,
      )
      lines.push(
        '  **Risk:** Frequently changing a high-impact package increases breakage risk.',
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}
