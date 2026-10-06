#!/usr/bin/env node
import { Command } from 'commander'
import { CONFIG } from '../config/index.ts'
import { generateAtlas } from '../generateAtlas.ts'
import type { AtlasConfig, DepType } from '../types.ts'

const program = new Command()

program
  .name('vl_atlas')
  .description('Generate an interactive dependency graph for your monorepo')
  .option('-o, --output <path>', 'Output HTML path', CONFIG.outputPath)
  .option(
    '-w, --workspaces <globs...>',
    'Workspace patterns',
    CONFIG.workspaces,
  )
  .option(
    '--dep-types <types...>',
    'Dependency types to include',
    CONFIG.depTypes,
  )
  .option('--include <patterns...>', 'Only include matching packages')
  .option('--exclude <patterns...>', 'Exclude matching packages')
  .option('--no-open', 'Do not auto-open the HTML')
  .option('--title <title>', 'Page title', CONFIG.title)
  .option('--report <format>', 'Generate report: markdown, json')
  .option('--no-report', 'Skip report generation')

program.parse()

const opts = program.opts()

const DEP_TYPES: DepType[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
]
const REPORT_FORMATS = ['markdown', 'json']

for (const t of opts.depTypes ?? []) {
  if (!DEP_TYPES.includes(t)) {
    program.error(
      `Invalid --dep-types value "${t}" (expected: ${DEP_TYPES.join(', ')})`,
    )
  }
}
if (typeof opts.report === 'string' && !REPORT_FORMATS.includes(opts.report)) {
  program.error(
    `Invalid --report value "${opts.report}" (expected: ${REPORT_FORMATS.join(', ')})`,
  )
}

const config: AtlasConfig = {
  workspaces: opts.workspaces ?? CONFIG.workspaces,
  depTypes: (opts.depTypes ?? CONFIG.depTypes) as DepType[],
  include: opts.include ?? CONFIG.include,
  exclude: opts.exclude ?? CONFIG.exclude,
  outputPath: opts.output ?? CONFIG.outputPath,
  echartsCdn: CONFIG.echartsCdn,
  open: opts.open ?? CONFIG.open,
  title: opts.title ?? CONFIG.title,
  report: opts.report === false ? false : (opts.report ?? CONFIG.report),
}

await generateAtlas(config)
