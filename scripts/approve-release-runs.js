#!/usr/bin/env node

/**
 * Approve the version PR's pending workflow runs.
 *
 * Only needed while the RELEASE_TOKEN secret is unset. Without it the version
 * PR is authored by github-actions[bot], which this repository's Actions
 * approval policy (`first_time_contributors`) gates, leaving its CI runs in
 * `action_required` so the PR can never go green on its own.
 *
 * See CONTRIBUTING.md > Publishing for the permanent fix.
 */

import { execFileSync } from 'node:child_process'

const BRANCH = 'changeset-release/main'

const gh = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let runs
try {
  runs = JSON.parse(
    gh([
      'run',
      'list',
      '--branch',
      BRANCH,
      '--limit',
      '20',
      '--json',
      'databaseId,workflowName,conclusion,headSha',
    ]),
  )
} catch (error) {
  console.error('Could not list workflow runs. Is the gh CLI installed and authenticated?')
  console.error(error.stderr?.toString().trim() || error.message)
  process.exit(1)
}

const pending = runs.filter((run) => run.conclusion === 'action_required')

if (pending.length === 0) {
  console.log(`Nothing awaiting approval on ${BRANCH}.`)
  process.exit(0)
}

// Approve only what is gating the version PR as it stands. Runs left over
// from superseded commits stay `action_required` forever, and approving those
// would burn CI on commits nobody is going to merge.
const [versionPr] = JSON.parse(
  gh(['pr', 'list', '--head', BRANCH, '--state', 'open', '--json', 'number,headRefOid']),
)

if (!versionPr) {
  console.log(
    `No open version PR. ${pending.length} gated run(s) remain on superseded commits; nothing to approve.`,
  )
  process.exit(0)
}

const head = versionPr.headRefOid
const current = pending.filter((run) => run.headSha === head)
const superseded = pending.length - current.length

if (current.length === 0) {
  console.log(
    `#${versionPr.number} is not waiting on approval ` +
      `(${superseded} gated run(s) belong to superseded commits).`,
  )
  process.exit(0)
}

let failed = 0
console.log(`Approving runs for #${versionPr.number} (${head.slice(0, 8)})`)

for (const run of current) {
  try {
    gh(['api', '-X', 'POST', `repos/{owner}/{repo}/actions/runs/${run.databaseId}/approve`])
    console.log(`✅ approved ${run.workflowName} (${run.databaseId})`)
  } catch (error) {
    console.error(`❌ could not approve ${run.workflowName} (${run.databaseId})`)
    console.error(`   ${error.stderr?.toString().trim() || error.message}`)
    failed++
  }
}

if (superseded > 0) {
  console.log(`\nSkipped ${superseded} run(s) on superseded commits.`)
}

process.exit(failed > 0 ? 1 : 0)
