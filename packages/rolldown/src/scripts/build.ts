import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { rolldown } from 'rolldown'
import { CONFIG, PKG } from '../config/index.ts'
import {
  buildAllDts,
  createBuildPipeline,
  config as rolldownConfig,
} from '../rolldown/index.ts'

const { log } = console
const allBuilds = createBuildPipeline()
const allBuildsCount = allBuilds.length

const FORMAT_LABEL: Record<string, string> = {
  cjs: 'CJS',
  es: 'ESM',
  umd: 'UMD',
  iife: 'IIFE',
}

const label = (text: string) => chalk.bold.bgCyan.black(` ${text} `)
const dim = chalk.dim
const bold = chalk.bold

async function build({
  inputOptions,
  outputOptions,
}: {
  inputOptions: any
  outputOptions: any
}) {
  const bundle = await rolldown(inputOptions)
  await bundle.write(outputOptions)
  await bundle.close()
}

/**
 * Longest common parent directory of a list of file paths.
 * '/lib/index.js' + '/lib/component.js' -> '/lib'
 * '/lib/index.js' + '/lib/sub/foo.js'   -> '/lib'
 */
const commonParent = (files: string[]): string => {
  if (files.length === 0) return '.'
  const split = files.map((f) => {
    const i = f.lastIndexOf('/')
    return i >= 0 ? f.substring(0, i).split('/') : ['.']
  })
  const head = split[0] as string[]
  let common: string[] = head
  for (const s of split.slice(1)) {
    const next: string[] = []
    for (let i = 0; i < Math.min(common.length, s.length); i++) {
      if (common[i] === s[i]) next.push(common[i] as string)
      else break
    }
    common = next
  }
  return common.length === 0 ? '.' : common.join('/')
}

const stripJsExt = (s: string): string => s.replace(/\.(m?js|cjs)$/, '')

/**
 * Partition variants into groups eligible for multi-entry shared-chunk
 * builds, and singletons that keep the per-entry path.
 *
 * Eligible: same (format, env, platform), explicit `input` set, and a
 * format that supports code-splitting (i.e. not umd/iife — those are
 * inherently standalone bundles).
 */
const partitionForSharedChunks = (variants: Record<string, any>[]) => {
  const buckets = new Map<string, Record<string, any>[]>()
  const singles: Record<string, any>[] = []
  for (const v of variants) {
    if (!v.input || ['umd', 'iife'].includes(v.format)) {
      singles.push(v)
      continue
    }
    const key = `${v.format}|${v.env}|${v.platform}`
    const bucket = buckets.get(key) ?? []
    bucket.push(v)
    buckets.set(key, bucket)
  }
  const groups: Record<string, any>[][] = []
  for (const bucket of buckets.values()) {
    if (bucket.length <= 1) singles.push(...bucket)
    else groups.push(bucket)
  }
  return { groups, singles }
}

/** Build one group of multi-entry variants as a single rolldown invocation. */
const buildGroup = async (group: Record<string, any>[]) => {
  // Use the first variant as the representative for format/env/platform —
  // they're identical across the group by construction.
  const head = group[0] as Record<string, any>
  const dir = commonParent(group.map((v) => v.file as string))
  // Entry name = file relative to common parent, with .js/.cjs/.mjs stripped.
  // rolldown preserves '/' in input keys, so nested entries map cleanly to
  // nested output paths via [name] in entryFileNames.
  const inputMap: Record<string, string> = {}
  for (const v of group) {
    const rel = (v.file as string).startsWith(`${dir}/`)
      ? (v.file as string).substring(dir.length + 1)
      : (v.file as string)
    inputMap[stripJsExt(rel)] = v.input as string
  }

  // Build via the per-variant config to inherit plugins/externals/etc.,
  // then override input + output for the group.
  const { output, ...inputOptions } = rolldownConfig(head)
  inputOptions.input = inputMap
  const outputOptions = {
    ...output,
    dir,
    entryFileNames: '[name].js',
    chunkFileNames: '_chunks/[name]-[hash].js',
  }

  const format = FORMAT_LABEL[head.format] || head.format
  const start = performance.now()
  try {
    await build({ inputOptions, outputOptions })
  } catch (e) {
    log(`\n${chalk.bold.red('Build failed')}`)
    log(chalk.gray(`  Format:  ${format}`))
    log(chalk.gray(`  Entries: ${Object.keys(inputMap).join(', ')}`))
    log(e)
    throw e
  }
  const duration = Math.round(performance.now() - start)
  log(
    `  ${chalk.green('+')} ${bold(format)} ${dim('->')} ${dim(`${dir}/{${Object.keys(inputMap).join(',')}}.js`)} ${dim(`(${duration}ms, shared chunks)`)}`,
  )
}

const buildSingle = async (item: Record<string, any>) => {
  const { output, ...inputOptions } = rolldownConfig(item)
  const format = FORMAT_LABEL[output.format] || output.format
  const start = performance.now()
  try {
    await build({ inputOptions, outputOptions: output })
  } catch (e) {
    log(`\n${chalk.bold.red('Build failed')}`)
    log(chalk.gray(`  Format: ${format}`))
    log(chalk.gray(`  File:   ${output.dir}/${output.entryFileNames}`))
    log(e)
    throw e
  }
  const duration = Math.round(performance.now() - start)
  log(
    `  ${chalk.green('+')} ${bold(format)} ${dim('->')} ${dim(`${output.dir}/${output.entryFileNames}`)} ${dim(`(${duration}ms)`)}`,
  )
}

const createBuilds = async () => {
  const { groups, singles } = partitionForSharedChunks(allBuilds)
  let p = Promise.resolve()
  for (const item of singles) p = p.then(() => buildSingle(item))
  for (const group of groups) p = p.then(() => buildGroup(group))
  return p
}

const copyStaticFiles = () => {
  if (!Array.isArray(CONFIG.copyFiles) || CONFIG.copyFiles.length === 0) return

  log(`\n${dim('Copying')} static files...\n`)
  for (const { from, to } of CONFIG.copyFiles as {
    from: string
    to: string
  }[]) {
    cpSync(from, to, { recursive: true })
    log(`  ${chalk.green('+')} ${dim(from)} ${dim('->')} ${dim(to)}`)
  }
}

/**
 * Build a single DTS entry in an isolated temp directory, then move the
 * largest .d.ts file (the real declarations) to the final output path.
 *
 * Rolldown code-splits DTS output: the entry file is a tiny re-export stub,
 * and the actual types go into a chunk. Building into a temp dir avoids
 * collisions when multiple DTS entries share the same output directory.
 */
const buildDtsIsolated = async (
  dtsConfig: ReturnType<typeof buildAllDts>[number],
) => {
  const { output, file, ...input } = dtsConfig
  const finalDir = output.dir as string
  const entryName = output.entryFileNames as string
  const tempDir = join(finalDir, `__dts_tmp_${entryName.replace(/\W/g, '_')}`)
  const absTempDir = join(process.cwd(), tempDir)

  try {
    // Build into isolated temp directory
    const tempOutput = { ...output, dir: tempDir }
    await build({ inputOptions: input, outputOptions: tempOutput })

    // Find the largest .d.ts file — that's the real declarations
    const dtsFiles = readdirSync(absTempDir).filter((f) => f.endsWith('.d.ts'))

    let bestFile = dtsFiles[0] || entryName
    let bestSize = 0
    for (const f of dtsFiles) {
      const size = statSync(join(absTempDir, f)).size
      if (size > bestSize) {
        bestSize = size
        bestFile = f
      }
    }

    // Move the best file to the final location
    const absFinalDir = join(process.cwd(), finalDir)
    mkdirSync(absFinalDir, { recursive: true })
    renameSync(join(absTempDir, bestFile), join(absFinalDir, entryName))

    // Move sourcemap if it exists
    const mapName = `${bestFile}.map`
    try {
      renameSync(
        join(absTempDir, mapName),
        join(absFinalDir, `${entryName}.map`),
      )
    } catch {
      // sourcemap may not exist
    }
  } finally {
    // Always remove the temp dir — even if the build or a post-step
    // throws — so a partial failure can't leak __dts_tmp_* into lib/.
    rmSync(absTempDir, { recursive: true, force: true })
  }
}

/**
 * Build N DTS entries that share an output dir as a SINGLE rolldown call.
 *
 * Each per-entry rolldown call instantiates the slow rolldown-plugin-dts
 * (and its embedded TS compiler) from scratch — that's the
 * `[PLUGIN_TIMINGS] rolldown-plugin-dts:generate` warning rolldown
 * itself surfaces. Doing the work in one call amortizes plugin/compiler
 * setup AND lets common imports (e.g. a shared `types.ts`) emit as one
 * `_chunks/*.d.ts` instead of being inlined into every entry's stub.
 *
 * Caveat the per-entry path also handles: rolldown-plugin-dts (0.25.2)
 * emits `<name>.d.ts` (empty re-export stub) AND `<name>2.d.ts` (the real
 * declarations). We pick the larger file per entry and move it to the
 * intended path — same shape as `buildDtsIsolated`, batched.
 */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Build the rolldown invocation options for a grouped DTS build. */
const buildGroupedDtsInvocation = (
  head: ReturnType<typeof buildAllDts>[number],
  inputMap: Record<string, string>,
  tempDir: string,
) => {
  const inputOptions = { ...head, input: inputMap }
  delete (inputOptions as { file?: unknown }).file
  const outputOptions = {
    ...head.output,
    dir: tempDir,
    entryFileNames: '[name].d.ts',
    chunkFileNames: '_chunks/[name]-[hash].d.ts',
  }
  return { inputOptions, outputOptions }
}

/** Pick the largest `<stem>NUMBER?.d.ts` file in `tempFiles` for an entry. */
const pickRealDtsFor = (
  stem: string,
  tempFiles: string[],
  absTempDir: string,
): string | undefined => {
  const re = new RegExp(`^${escapeRe(stem)}\\d*\\.d\\.ts$`)
  let best: string | undefined
  let bestSize = -1
  for (const f of tempFiles) {
    if (!re.test(f)) continue
    const size = statSync(join(absTempDir, f)).size
    if (size > bestSize) {
      bestSize = size
      best = f
    }
  }
  return best
}

/**
 * Move each entry's "real" .d.ts out of the temp dir to its final path.
 * Returns the list of `oldStem -> newStem` renames the import-path
 * repair step needs to know about.
 */
const promoteEntries = (
  entryStems: string[],
  absTempDir: string,
  absFinalDir: string,
): { oldStem: string; newStem: string }[] => {
  const tempFiles = readdirSync(absTempDir)
  const renamed: { oldStem: string; newStem: string }[] = []
  for (const stem of entryStems) {
    const best = pickRealDtsFor(stem, tempFiles, absTempDir)
    if (!best) continue
    const oldStem = best.replace(/\.d\.ts$/, '')
    renameSync(join(absTempDir, best), join(absFinalDir, `${stem}.d.ts`))
    if (oldStem !== stem) renamed.push({ oldStem, newStem: stem })
  }
  return renamed
}

/**
 * Move the plugin's `_chunks/` dir (shared types) alongside the entries.
 * The `import "./_chunks/shared-X.js"` references in entry files resolve
 * to `_chunks/shared-X.d.ts` via TS's adjacent-`.d.ts`-to-`.js` rule.
 */
const promoteChunksDir = (absTempDir: string, absFinalDir: string) => {
  const tempChunksDir = join(absTempDir, '_chunks')
  if (!existsSync(tempChunksDir)) return
  const finalChunksDir = join(absFinalDir, '_chunks')
  rmSync(finalChunksDir, { recursive: true, force: true })
  renameSync(tempChunksDir, finalChunksDir)
}

/**
 * Repair stale import paths. When the plugin code-splits across entries,
 * one entry's .d.ts may reference `./otherEntry2.js` — but after we rename
 * `otherEntry2.d.ts -> otherEntry.d.ts`, that reference no longer resolves.
 * Without this, real consumers fail typechecks with `TS2307: Cannot find
 * module './otherEntry2.js'` (caught by skipLibCheck:false consumers).
 */
const repairStaleImports = (
  entryStems: string[],
  absFinalDir: string,
  renamed: { oldStem: string; newStem: string }[],
) => {
  if (renamed.length === 0) return
  const { readFileSync, writeFileSync } =
    require('node:fs') as typeof import('node:fs')
  for (const stem of entryStems) {
    const filePath = join(absFinalDir, `${stem}.d.ts`)
    let content = readFileSync(filePath, 'utf-8')
    let changed = false
    for (const { oldStem, newStem } of renamed) {
      const re = new RegExp(
        `(["'\\s/])\\./${escapeRe(oldStem)}\\.js(["'])`,
        'g',
      )
      if (re.test(content)) {
        content = content.replace(re, `$1./${newStem}.js$2`)
        changed = true
      }
    }
    if (changed) writeFileSync(filePath, content)
  }
}

const buildDtsGrouped = async (
  group: ReturnType<typeof buildAllDts>,
): Promise<void> => {
  const head = group[0]
  if (!head) return
  const finalDir = head.output.dir as string

  const groupTag = group
    .map((g) => (g.output.entryFileNames as string).replace(/\W/g, '_'))
    .join('_')
  const tempDir = join(finalDir, `__dts_tmp_grp_${groupTag.substring(0, 60)}`)
  const absTempDir = join(process.cwd(), tempDir)

  const inputMap: Record<string, string> = {}
  const entryStems: string[] = []
  for (const g of group) {
    const stem = (g.output.entryFileNames as string).replace(/\.d\.ts$/, '')
    inputMap[stem] = g.input as string
    entryStems.push(stem)
  }

  try {
    await build(buildGroupedDtsInvocation(head, inputMap, tempDir))

    const absFinalDir = join(process.cwd(), finalDir)
    mkdirSync(absFinalDir, { recursive: true })

    const renamed = promoteEntries(entryStems, absTempDir, absFinalDir)
    promoteChunksDir(absTempDir, absFinalDir)
    repairStaleImports(entryStems, absFinalDir, renamed)
  } finally {
    rmSync(absTempDir, { recursive: true, force: true })
  }
}

/**
 * Partition DTS configs into groupable buckets by output dir. A bucket
 * of ≥2 entries goes through the single-pass `buildDtsGrouped`; singletons
 * keep `buildDtsIsolated`. Same shape as the JS pipeline in `createBuilds`.
 */
const partitionDts = (configs: ReturnType<typeof buildAllDts>) => {
  const buckets = new Map<string, ReturnType<typeof buildAllDts>>()
  for (const c of configs) {
    const k = c.output.dir as string
    const b = buckets.get(k) ?? []
    b.push(c)
    buckets.set(k, b)
  }
  const groups: ReturnType<typeof buildAllDts>[] = []
  const singles: ReturnType<typeof buildAllDts> = []
  for (const b of buckets.values()) {
    if (b.length <= 1) singles.push(...b)
    else groups.push(b)
  }
  return { groups, singles }
}

const generateDeclarations = async () => {
  const dtsConfigs = buildAllDts()
  if (dtsConfigs.length === 0) return

  log(`\n${dim('Generating')} declarations...`)

  const { groups, singles } = partitionDts(dtsConfigs)

  for (const dtsFile of singles) {
    const tscStart = performance.now()
    await buildDtsIsolated(dtsFile)
    const tscDuration = Math.round(performance.now() - tscStart)
    log(
      `  ${chalk.green('+')} ${bold('DTS')} ${dim('->')} ${dim(dtsFile.file)} ${dim(`(${tscDuration}ms)`)}`,
    )
  }

  for (const group of groups) {
    const tscStart = performance.now()
    await buildDtsGrouped(group)
    const tscDuration = Math.round(performance.now() - tscStart)
    const names = group.map((g) => g.output.entryFileNames as string).join(', ')
    log(
      `  ${chalk.green('+')} ${bold('DTS')} ${dim('->')} ${dim(
        `${group[0]?.output.dir}/{${names}}`,
      )} ${dim(`(${tscDuration}ms, single-pass)`)}`,
    )
  }
}

const runBuild = async () => {
  const start = performance.now()

  log(
    `\n${label('rolldown')} ${bold(PKG.name || '')} ${dim(`v${PKG.version || '0.0.0'}`)}\n`,
  )

  log(`${dim('Cleaning')} ${CONFIG.outputDir}/`)
  rmSync(`${process.cwd()}/${CONFIG.outputDir}`, {
    recursive: true,
    force: true,
  })

  log(
    `${dim('Building')} ${bold(String(allBuildsCount))} bundle${allBuildsCount > 1 ? 's' : ''}...\n`,
  )

  await createBuilds()
  copyStaticFiles()
  await generateDeclarations()

  const total = Math.round(performance.now() - start)
  log(`\n${chalk.green('Done')} ${dim(`in ${total}ms`)}\n`)
}

export { runBuild }
