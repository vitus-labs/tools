import { execSync } from 'node:child_process'
import { relative } from 'node:path'
import type { ChangeFrequencyResult, DepGraph, ImpactResult } from '../types'

const isGitRepo = (): boolean => {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export const analyzeChangeFrequency = (
  graph: DepGraph,
  impact: ImpactResult,
): ChangeFrequencyResult | null => {
  if (!isGitRepo()) return null

  const cwd = process.cwd()
  const frequencyMap: ChangeFrequencyResult['frequencyMap'] = {}

  for (const node of graph.nodes) {
    const relPath = relative(cwd, node.path)
    try {
      const logOutput = execSync(
        `git log --format=%H --since=90.days -- "${relPath}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] },
      ).trim()

      const commits = logOutput ? logOutput.split('\n').length : 0

      let lastChanged = ''
      if (commits > 0) {
        lastChanged = execSync(`git log -1 --format=%cI -- "${relPath}"`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }).trim()
      }

      frequencyMap[node.name] = { commits, lastChanged }
    } catch {
      frequencyMap[node.name] = { commits: 0, lastChanged: '' }
    }
  }

  // Identify hotspots: high impact (>= 3 dependents) + high change (>= 10 commits)
  const hotspots = graph.nodes
    .filter((node) => {
      const dependents = (impact.impactMap[node.name] ?? []).length
      const commits = frequencyMap[node.name]?.commits ?? 0
      return dependents >= 3 && commits >= 10
    })
    .map((n) => n.name)
    .sort()

  return { frequencyMap, hotspots }
}
