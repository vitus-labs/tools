import { execFileSync } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DepGraph, ImpactResult } from '../types.ts'
import { analyzeChangeFrequency } from './change-frequency.ts'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

const mockedExecFileSync = vi.mocked(execFileSync)

// Mock cwd so relative(cwd, '/packages/x') === 'packages/x' and the
// path-bucketing in analyzeChangeFrequency can match the mock log lines.
beforeEach(() => {
  vi.spyOn(process, 'cwd').mockReturnValue('/')
})
afterEach(() => vi.restoreAllMocks())

const node = (name: string) => ({
  name,
  version: '1.0.0',
  path: `/packages/${name}`,
  private: false,
})

const graph: DepGraph = {
  nodes: [node('a')],
  edges: [],
}

const impact: ImpactResult = { impactMap: { a: [] } }

/** Build a fake `git log --name-only --format=__COMMIT__%H %cI` output. */
const fakeLog = (
  commits: { hash: string; date: string; files: string[] }[],
): string =>
  commits
    .map(
      ({ hash, date, files }) =>
        `__COMMIT__${hash} ${date}\n${files.join('\n')}\n`,
    )
    .join('\n')

const mockSingleGitLog = (output: string) => {
  mockedExecFileSync.mockImplementation((_cmd: string, args?: string[]) => {
    const argsStr = (args ?? []).join(' ')
    if (argsStr.includes('rev-parse')) return ''
    if (argsStr.includes('--name-only')) return output
    return ''
  })
}

describe('analyzeChangeFrequency', () => {
  it('should return null when not in a git repo', () => {
    mockedExecFileSync.mockImplementation(() => {
      throw new Error('not a git repo')
    })

    const result = analyzeChangeFrequency(graph, impact)
    expect(result).toBeNull()
  })

  it('should count commits per package', () => {
    mockSingleGitLog(
      fakeLog(
        Array.from({ length: 12 }, (_, i) => ({
          hash: `h${i}`,
          date: '2026-02-20T10:00:00+01:00',
          files: ['packages/a/src/index.ts'],
        })),
      ),
    )

    const result = analyzeChangeFrequency(graph, impact)
    expect(result).not.toBeNull()
    expect(result?.frequencyMap.a?.commits).toBe(12)
  })

  it('should extract last changed date (most recent commit, git log default order)', () => {
    mockSingleGitLog(
      fakeLog([
        {
          hash: 'h1',
          date: '2026-02-20T10:00:00+01:00',
          files: ['packages/a/src/index.ts'],
        },
        {
          hash: 'h2',
          date: '2026-01-01T10:00:00+01:00',
          files: ['packages/a/src/index.ts'],
        },
      ]),
    )

    const result = analyzeChangeFrequency(graph, impact)
    expect(result?.frequencyMap.a?.lastChanged).toContain('2026-02-20')
  })

  it('counts a commit touching the same package twice only once', () => {
    mockSingleGitLog(
      fakeLog([
        {
          hash: 'h1',
          date: '2026-02-20T10:00:00+01:00',
          files: ['packages/a/src/a.ts', 'packages/a/src/b.ts'],
        },
      ]),
    )
    const result = analyzeChangeFrequency(graph, impact)
    expect(result?.frequencyMap.a?.commits).toBe(1)
  })

  it('does not let a package prefix absorb a longer-named sibling', () => {
    // pkg-a should NOT collect files from pkg-a-extra/
    const wider: DepGraph = {
      nodes: [
        {
          name: 'pkg-a',
          version: '1',
          path: '/packages/pkg-a',
          private: false,
        },
        {
          name: 'pkg-a-extra',
          version: '1',
          path: '/packages/pkg-a-extra',
          private: false,
        },
      ],
      edges: [],
    }
    mockSingleGitLog(
      fakeLog([
        {
          hash: 'h1',
          date: '2026-02-20T10:00:00+01:00',
          files: ['packages/pkg-a-extra/src/index.ts'],
        },
      ]),
    )
    const result = analyzeChangeFrequency(wider, { impactMap: {} })
    expect(result?.frequencyMap['pkg-a']?.commits).toBe(0)
    expect(result?.frequencyMap['pkg-a-extra']?.commits).toBe(1)
  })

  it('should handle git log failure for a package gracefully', () => {
    mockedExecFileSync.mockImplementation((_cmd: string, args?: string[]) => {
      const argsStr = (args ?? []).join(' ')
      if (argsStr.includes('rev-parse')) return ''
      throw new Error('git log failed')
    })

    const result = analyzeChangeFrequency(graph, impact)
    expect(result).not.toBeNull()
    expect(result?.frequencyMap.a).toEqual({ commits: 0, lastChanged: '' })
  })

  it('should identify hotspots', () => {
    mockSingleGitLog(
      fakeLog(
        Array.from({ length: 12 }, (_, i) => ({
          hash: `h${i}`,
          date: '2026-02-20T10:00:00+01:00',
          files: ['packages/a/src/index.ts'],
        })),
      ),
    )

    const multiGraph: DepGraph = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [],
    }
    const multiImpact: ImpactResult = {
      impactMap: { a: ['b', 'c', 'd'], b: [], c: [], d: [] },
    }

    const result = analyzeChangeFrequency(multiGraph, multiImpact)
    expect(result?.hotspots).toContain('a')
  })
})
