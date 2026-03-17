#!/usr/bin/env node

/**
 * Publish script for bun workspaces with npm OIDC provenance.
 *
 * Uses `bun pm pack` to create tarballs (resolves workspace:^ automatically),
 * then `npm publish <tarball> --provenance` for OIDC trusted publishing.
 */

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const packagesDir = join(import.meta.dirname, '..', 'packages')
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(packagesDir, d.name))

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

  try {
    console.log(`📦 Publishing ${pkg.name}@${pkg.version}...`)

    // Pack with bun (resolves workspace:^ → ^x.y.z)
    const tarball = execSync('bun pm pack', { cwd: dir, encoding: 'utf8' })
      .trim()
      .split('\n')
      .pop()
    const tarballPath = join(dir, tarball)

    // Publish tarball with npm (OIDC provenance)
    execSync(`npm publish "${tarballPath}" --provenance --access public`, {
      cwd: dir,
      stdio: 'inherit',
    })

    // Clean up tarball
    unlinkSync(tarballPath)
    published++
  } catch {
    console.error(`❌ Failed to publish ${pkg.name}@${pkg.version}`)
    failed++
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
