#!/usr/bin/env node

/**
 * Publish script for bun workspaces with npm OIDC provenance.
 *
 * Resolves `workspace:` dependency ranges from the versions on disk, packs
 * with `bun pm pack`, then publishes with `npm publish <tarball> --provenance`
 * for OIDC trusted publishing.
 *
 * The workspace ranges are resolved here rather than left to `bun pm pack`,
 * which reads the versions recorded in bun.lock. Those records are only
 * refreshed when the lockfile is regenerated from scratch — `bun install`,
 * even with --force, leaves them alone — so after `changeset version` they
 * still hold the previous release's numbers. Relying on them published
 * internal dependencies pointing at stale versions for several releases
 * (2.6.3 shipped depending on ^2.5.0). Resolving from package.json keeps the
 * published range locked to whatever is actually being released.
 *
 * Usage: node scripts/publish.js [--tag <dist-tag>]
 *
 * `--tag` publishes under a dist-tag other than `latest` (snapshot releases
 * use `--tag next`) and skips creating git tags.
 */

import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const tagIndex = process.argv.indexOf('--tag')
const distTag = tagIndex === -1 ? undefined : process.argv[tagIndex + 1]
if (tagIndex !== -1 && (!distTag || distTag.startsWith('-'))) {
  console.error('Usage: node scripts/publish.js [--tag <dist-tag>]')
  process.exit(1)
}

const packagesDir = join(import.meta.dirname, '..', 'packages')
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(packagesDir, d.name))

const readManifest = (dir) =>
  JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))

/** Every workspace package name -> the version about to be published. */
const workspaceVersions = new Map(
  packageDirs.map((dir) => {
    const pkg = readManifest(dir)
    return [pkg.name, pkg.version]
  }),
)

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
]

/**
 * Order packages so each one is published after the workspace packages it
 * depends on at runtime. Otherwise a consumer installing mid-release (or
 * after a partial failure) can get a package whose pinned internal
 * dependency does not exist on the registry yet.
 */
const RUNTIME_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]

const sortTopologically = (dirs) => {
  const byName = new Map(dirs.map((dir) => [readManifest(dir).name, dir]))
  const ordered = []
  const state = new Map() // name -> 'visiting' | 'done'

  const visit = (name) => {
    if (state.get(name) === 'done') return
    // A cycle cannot be ordered; fall back to discovery order for it.
    if (state.get(name) === 'visiting') return
    state.set(name, 'visiting')
    const pkg = readManifest(byName.get(name))
    for (const field of RUNTIME_FIELDS) {
      for (const dep of Object.keys(pkg[field] ?? {})) {
        if (byName.has(dep)) visit(dep)
      }
    }
    state.set(name, 'done')
    ordered.push(byName.get(name))
  }

  for (const name of byName.keys()) visit(name)
  return ordered
}

/**
 * Whether `name@version` is already on the registry. Only a 404 means "not
 * published"; any other failure (network, auth, registry outage) is
 * rethrown so the package is reported as failed instead of being
 * republished blindly.
 */
const isPublished = (name, version) => {
  try {
    execSync(`npm view ${name}@${version} version`, { stdio: 'pipe' })
    return true
  } catch (error) {
    const stderr = String(error.stderr ?? '')
    if (stderr.includes('E404') || stderr.includes('404 Not Found')) {
      return false
    }
    throw new Error(`npm view ${name}@${version} failed:\n${stderr.trim()}`)
  }
}

/**
 * Turn one `workspace:` range into real semver, honouring the protocol:
 * `workspace:*` pins exactly, `workspace:^` and `workspace:~` keep their
 * operator, and an explicit range such as `workspace:^1.2.3` is taken
 * verbatim.
 */
const resolveWorkspaceRange = (range, version) => {
  const protocol = range.slice('workspace:'.length)
  if (protocol === '*' || protocol === '') return version
  if (protocol === '^' || protocol === '~') return `${protocol}${version}`
  return protocol
}

/**
 * Replace every `workspace:` range in a manifest with real semver. Returns
 * the rewritten manifest, or null when nothing changed.
 */
const resolveWorkspaceRanges = (pkg) => {
  const resolved = structuredClone(pkg)
  let touched = false

  for (const field of DEPENDENCY_FIELDS) {
    const deps = resolved[field] ?? {}

    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== 'string' || !range.startsWith('workspace:')) continue

      const version = workspaceVersions.get(name)
      if (!version) {
        throw new Error(
          `${pkg.name}: ${field}.${name} is "${range}" but ${name} is not a workspace package`,
        )
      }

      deps[name] = resolveWorkspaceRange(range, version)
      touched = true
    }
  }

  return touched ? resolved : null
}

/** Fail loudly rather than publish a tarball with unresolved or stale ranges. */
const assertTarballIsSound = (tarballPath, pkg) => {
  const manifest = JSON.parse(
    execSync(`tar -xzOf "${tarballPath}" package/package.json`, {
      encoding: 'utf8',
    }),
  )

  if (manifest.version !== pkg.version) {
    throw new Error(
      `${pkg.name}: packed version ${manifest.version} != ${pkg.version}`,
    )
  }

  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        throw new Error(
          `${pkg.name}: ${field}.${name} still unresolved ("${range}")`,
        )
      }

      const expected = workspaceVersions.get(name)
      if (expected && !range.includes(expected)) {
        throw new Error(
          `${pkg.name}: ${field}.${name} is "${range}", expected it to pin ${expected}`,
        )
      }
    }
  }
}

let published = 0
let skipped = 0
let failed = 0

for (const dir of sortTopologically(packageDirs)) {
  const pkg = readManifest(dir)

  if (pkg.private) {
    continue
  }

  const manifestPath = join(dir, 'package.json')
  const originalManifest = readFileSync(manifestPath, 'utf8')
  let manifestRewritten = false
  let tarballPath

  try {
    if (isPublished(pkg.name, pkg.version)) {
      console.log(`⏭️  ${pkg.name}@${pkg.version} already published`)
      skipped++
      continue
    }

    console.log(`📦 Publishing ${pkg.name}@${pkg.version}...`)

    // Swap workspace: ranges for real versions just long enough to pack.
    const resolved = resolveWorkspaceRanges(pkg)
    if (resolved) {
      writeFileSync(manifestPath, `${JSON.stringify(resolved, null, 2)}\n`)
      manifestRewritten = true
    }

    const packOutput = execSync('bun pm pack', { cwd: dir, encoding: 'utf8' })
    const tarball = packOutput
      .trim()
      .split('\n')
      .find((line) => line.endsWith('.tgz'))
    if (!tarball) {
      throw new Error(
        `Could not find .tgz in bun pm pack output:\n${packOutput}`,
      )
    }
    tarballPath = join(dir, tarball)

    assertTarballIsSound(tarballPath, pkg)

    // Restore before publishing, so a failure mid-publish cannot leave the
    // working tree holding a rewritten manifest.
    if (manifestRewritten) {
      writeFileSync(manifestPath, originalManifest)
      manifestRewritten = false
    }

    // Publish tarball with npm (OIDC provenance)
    const tagFlag = distTag ? ` --tag ${distTag}` : ''
    execSync(
      `npm publish "${tarballPath}" --provenance --access public${tagFlag}`,
      { cwd: dir, stdio: 'inherit' },
    )

    published++
  } catch (error) {
    console.error(`❌ Failed to publish ${pkg.name}@${pkg.version}`)
    console.error(`   ${error.message}`)
    failed++
  } finally {
    if (manifestRewritten) writeFileSync(manifestPath, originalManifest)
    if (tarballPath) rmSync(tarballPath, { force: true })
  }
}

console.log(
  `\n✅ Published: ${published}, ⏭️ Skipped: ${skipped}, ❌ Failed: ${failed}`,
)

// Create git tags — only for a complete stable release. Tagging after a
// partial failure would tag versions that never reached the registry; the
// next run publishes the rest (already-published ones are skipped) and tags
// then. Snapshot (dist-tag) releases are not tagged.
if (published > 0 && failed === 0 && !distTag) {
  try {
    execSync('changeset tag', { stdio: 'inherit' })
  } catch {
    // Tags may already exist
  }
}

if (failed > 0) {
  process.exit(1)
}
