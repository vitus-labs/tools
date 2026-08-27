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
 */

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const packagesDir = join(import.meta.dirname, '..', 'packages')
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(packagesDir, d.name))

/** Every workspace package name -> the version about to be published. */
const workspaceVersions = new Map(
  packageDirs.map((dir) => {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
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
 * Replace `workspace:` ranges with real semver, honouring the protocol:
 * `workspace:*` pins exactly, `workspace:^` and `workspace:~` keep their
 * operator. Returns the rewritten manifest, or null when nothing changed.
 */
const resolveWorkspaceRanges = (pkg) => {
  const resolved = structuredClone(pkg)
  let touched = false

  for (const field of DEPENDENCY_FIELDS) {
    const deps = resolved[field]
    if (!deps) continue

    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== 'string' || !range.startsWith('workspace:')) continue

      const version = workspaceVersions.get(name)
      if (!version) {
        throw new Error(
          `${pkg.name}: ${field}.${name} is "${range}" but ${name} is not a workspace package`,
        )
      }

      const protocol = range.slice('workspace:'.length)
      if (protocol === '*' || protocol === '') {
        deps[name] = version
      } else if (protocol === '^' || protocol === '~') {
        deps[name] = `${protocol}${version}`
      } else {
        // An explicit range such as `workspace:^1.2.3` — take it verbatim.
        deps[name] = protocol
      }
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

for (const dir of packageDirs) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))

  if (pkg.private) {
    continue
  }

  // Check if already published
  try {
    execSync(`npm view ${pkg.name}@${pkg.version} version`, { stdio: 'pipe' })
    console.log(`⏭️  ${pkg.name}@${pkg.version} already published`)
    skipped++
    continue
  } catch {
    // Not published yet
  }

  const manifestPath = join(dir, 'package.json')
  const originalManifest = readFileSync(manifestPath, 'utf8')
  let manifestRewritten = false

  try {
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
      throw new Error(`Could not find .tgz in bun pm pack output:\n${packOutput}`)
    }
    const tarballPath = join(dir, tarball)

    assertTarballIsSound(tarballPath, pkg)

    // Restore before publishing, so a failure mid-publish cannot leave the
    // working tree holding a rewritten manifest.
    if (manifestRewritten) {
      writeFileSync(manifestPath, originalManifest)
      manifestRewritten = false
    }

    // Publish tarball with npm (OIDC provenance)
    execSync(`npm publish "${tarballPath}" --provenance --access public`, {
      cwd: dir,
      stdio: 'inherit',
    })

    // Clean up tarball
    unlinkSync(tarballPath)
    published++
  } catch (error) {
    console.error(`❌ Failed to publish ${pkg.name}@${pkg.version}`)
    console.error(`   ${error.message}`)
    failed++
  } finally {
    if (manifestRewritten) writeFileSync(manifestPath, originalManifest)
  }
}

console.log(
  `\n✅ Published: ${published}, ⏭️ Skipped: ${skipped}, ❌ Failed: ${failed}`,
)

// Create git tags
if (published > 0) {
  try {
    execSync('changeset tag', { stdio: 'inherit' })
  } catch {
    // Tags may already exist
  }
}

if (failed > 0) {
  process.exit(1)
}
