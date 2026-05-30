import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'
import type { ChangeFrequencyResult, DepGraph, ImpactResult } from '../types.ts'

const isGitRepo = (): boolean => {
  try {
    execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const COMMIT_MARKER = '__COMMIT__'

const runFullGitLog = (cwd: string): string | null => {
  try {
    return execFileSync(
      'git',
      [
        'log',
        '--since=90.days',
        '--name-only',
        `--format=${COMMIT_MARKER}%H %cI`,
        '--no-renames',
      ],
      {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        maxBuffer: 64 * 1024 * 1024,
      },
    )
  } catch {
    return null
  }
}

// Sorted longest-prefix-first so `pkg-a` cannot wrongly absorb files
// from `pkg-a-extra/`.
const buildPathIndex = (
  graph: DepGraph,
  cwd: string,
): { prefix: string; name: string }[] =>
  graph.nodes
    .map((n) => ({ prefix: `${relative(cwd, n.path)}/`, name: n.name }))
    .sort((a, b) => b.prefix.length - a.prefix.length)

const matchPackage = (
  file: string,
  index: { prefix: string; name: string }[],
): string | null => {
  for (const { prefix, name } of index) {
    if (file.startsWith(prefix)) return name
  }
  return null
}

const recordFile = (
  out: ChangeFrequencyResult['frequencyMap'],
  name: string,
  date: string,
  seenForCommit: Set<string>,
): void => {
  if (seenForCommit.has(name)) return
  seenForCommit.add(name)
  const entry = out[name]
  if (!entry) return
  entry.commits++
  // First commit seen is most recent (git log default order).
  if (!entry.lastChanged) entry.lastChanged = date
}

/**
 * Single `git log --name-only` over the whole repo, then bucket each
 * commit's touched files by which package path they belong to. Replaces
 * 2 × N `git log` spawns with 1 — wall-clock drops from ~30ms × N to
 * ~30ms total. Verified parity (commits + lastChanged) on real monorepos.
 */
const collectFrequencyMap = (
  graph: DepGraph,
  cwd: string,
): ChangeFrequencyResult['frequencyMap'] => {
  const out: ChangeFrequencyResult['frequencyMap'] = {}
  for (const n of graph.nodes) out[n.name] = { commits: 0, lastChanged: '' }

  const log = runFullGitLog(cwd)
  if (log === null) return out

  const index = buildPathIndex(graph, cwd)
  const seenForCommit = new Set<string>()
  let date = ''

  for (const line of log.split('\n')) {
    if (line.startsWith(COMMIT_MARKER)) {
      const space = line.indexOf(' ')
      date = space >= 0 ? line.substring(space + 1).trim() : ''
      seenForCommit.clear()
      continue
    }
    if (!line) continue
    const name = matchPackage(line, index)
    if (name) recordFile(out, name, date, seenForCommit)
  }
  return out
}

export const analyzeChangeFrequency = (
  graph: DepGraph,
  impact: ImpactResult,
): ChangeFrequencyResult | null => {
  if (!isGitRepo()) return null

  const cwd = process.cwd()
  const frequencyMap = collectFrequencyMap(graph, cwd)

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
