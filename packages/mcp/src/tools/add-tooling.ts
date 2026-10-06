import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { BIOME_SCHEMA, VERSIONS } from '../versions.ts'
import { absolutePath, errorResult, writeIfMissing } from './utils.ts'

const TOOLS = [
  'typescript',
  'lint',
  'vitest',
  'rolldown',
  'rollup',
  'nextjs',
  'nextjs-images',
  'storybook',
  'favicon',
  'atlas',
] as const

type Tool = (typeof TOOLS)[number]

interface ToolAction {
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
  files?: Array<{ path: string; content: string }>
}

const getToolActions = (tool: Tool): ToolAction => {
  switch (tool) {
    case 'typescript':
      return {
        devDependencies: {
          '@vitus-labs/tools-typescript': VERSIONS.vitusLabs,
          typescript: VERSIONS.typescript,
        },
        files: [
          {
            path: 'tsconfig.json',
            content: JSON.stringify(
              {
                extends: '@vitus-labs/tools-typescript/lib',
                compilerOptions: {
                  noEmit: false,
                  outDir: 'lib',
                  rootDir: 'src',
                },
                include: ['src'],
                exclude: ['node_modules', 'lib', '**/*.test.ts'],
              },
              null,
              2,
            ),
          },
        ],
      }
    case 'lint':
      return {
        devDependencies: {
          '@vitus-labs/tools-lint': VERSIONS.vitusLabs,
          '@biomejs/biome': VERSIONS.biome,
        },
        scripts: {
          lint: 'biome check .',
          format: 'biome format --write .',
        },
        files: [
          {
            path: 'biome.json',
            content: JSON.stringify(
              {
                $schema: BIOME_SCHEMA,
                extends: ['@vitus-labs/tools-lint/biome'],
              },
              null,
              2,
            ),
          },
        ],
      }
    case 'vitest':
      return {
        devDependencies: {
          '@vitus-labs/tools-vitest': VERSIONS.vitusLabs,
          vitest: VERSIONS.vitest,
          '@vitest/coverage-v8': VERSIONS.vitestCoverage,
          vite: VERSIONS.vite,
        },
        scripts: {
          test: 'vitest run',
          'test:watch': 'vitest',
          'test:coverage': 'vitest run --coverage',
        },
        files: [
          {
            path: 'vitest.config.ts',
            content: `import { createVitestConfig } from '@vitus-labs/tools-vitest'\n\nexport default createVitestConfig()\n`,
          },
        ],
      }
    case 'rolldown':
      return {
        devDependencies: { '@vitus-labs/tools-rolldown': VERSIONS.vitusLabs },
        scripts: {
          build: 'vl_rolldown_build',
          dev: 'vl_rolldown_build-watch',
        },
      }
    case 'rollup':
      return {
        devDependencies: { '@vitus-labs/tools-rollup': VERSIONS.vitusLabs },
        scripts: { build: 'vl_build', dev: 'vl_build-watch' },
      }
    case 'nextjs':
      return {
        dependencies: { '@vitus-labs/tools-nextjs': VERSIONS.vitusLabs },
        files: [
          {
            path: 'next.config.ts',
            content: `import { withVitusLabs } from '@vitus-labs/tools-nextjs'\n\nexport default withVitusLabs({})\n`,
          },
        ],
      }
    case 'nextjs-images':
      return {
        dependencies: { '@vitus-labs/tools-nextjs-images': VERSIONS.vitusLabs },
      }
    case 'storybook':
      return {
        devDependencies: { '@vitus-labs/tools-storybook': VERSIONS.vitusLabs },
        scripts: {
          stories: 'vl_stories',
          'stories:build': 'vl_stories-build',
        },
      }
    case 'favicon':
      return {
        devDependencies: { '@vitus-labs/tools-favicon': VERSIONS.vitusLabs },
        scripts: { favicon: 'vl_favicon' },
      }
    case 'atlas':
      return {
        devDependencies: { '@vitus-labs/tools-atlas': VERSIONS.vitusLabs },
        scripts: { atlas: 'vl_atlas' },
      }
  }
}

interface SkippedItems {
  deps: string[]
  scripts: string[]
  files: string[]
}

const hasOwn = (obj: Record<string, unknown>, key: string) =>
  Object.hasOwn(obj, key)

const applyToolAction = (
  pkg: Record<string, unknown>,
  directory: string,
  actions: ToolAction,
) => {
  const addedDeps: string[] = []
  const addedScripts: string[] = []
  const createdFiles: string[] = []
  const skipped: SkippedItems = { deps: [], scripts: [], files: [] }

  const asRecord = (value: unknown) => (value ?? {}) as Record<string, string>
  // A package already declared in either section is never touched, so we don't
  // downgrade a user's version or duplicate it across sections.
  const declared = () => ({
    ...asRecord(pkg.dependencies),
    ...asRecord(pkg.devDependencies),
    ...asRecord(pkg.peerDependencies),
    ...asRecord(pkg.optionalDependencies),
  })

  const addDeps = (
    field: 'dependencies' | 'devDependencies',
    wanted: Record<string, string>,
  ) => {
    const target = { ...asRecord(pkg[field]) }
    for (const [name, range] of Object.entries(wanted)) {
      if (hasOwn(declared(), name)) {
        skipped.deps.push(name)
        continue
      }
      target[name] = range
      pkg[field] = target
      addedDeps.push(name)
    }
  }

  if (actions.dependencies) addDeps('dependencies', actions.dependencies)
  if (actions.devDependencies)
    addDeps('devDependencies', actions.devDependencies)

  if (actions.scripts) {
    const existing = asRecord(pkg.scripts)
    for (const [name, command] of Object.entries(actions.scripts)) {
      if (hasOwn(existing, name)) {
        skipped.scripts.push(name)
        continue
      }
      existing[name] = command
      pkg.scripts = existing
      addedScripts.push(name)
    }
  }

  if (actions.files) {
    for (const file of actions.files) {
      if (writeIfMissing(join(directory, file.path), file.content)) {
        createdFiles.push(file.path)
      } else {
        skipped.files.push(file.path)
      }
    }
  }

  return { addedDeps, addedScripts, createdFiles, skipped }
}

const formatSkipped = (skipped: SkippedItems): string[] => {
  const lines: string[] = []
  if (skipped.deps.length > 0)
    lines.push(`  Dependencies: ${skipped.deps.join(', ')}`)
  if (skipped.scripts.length > 0)
    lines.push(`  Scripts: ${skipped.scripts.join(', ')}`)
  for (const f of skipped.files) lines.push(`  - ${f}`)

  return lines.length > 0
    ? ['', 'Skipped (already present, left untouched):', ...lines]
    : []
}

const formatResult = (
  tools: readonly string[],
  addedDeps: string[],
  addedScripts: string[],
  createdFiles: string[],
  skipped: SkippedItems = { deps: [], scripts: [], files: [] },
) => {
  const changed =
    addedDeps.length + addedScripts.length + createdFiles.length > 0
  const parts: string[] = [
    changed
      ? `Added tools: ${tools.join(', ')}`
      : `No changes made for tools: ${tools.join(', ')} (everything already present)`,
  ]

  if (addedDeps.length > 0 || addedScripts.length > 0) {
    parts.push('', 'Updated package.json:')
    if (addedDeps.length > 0)
      parts.push(`  Dependencies: ${addedDeps.join(', ')}`)
    if (addedScripts.length > 0)
      parts.push(`  Scripts: ${addedScripts.join(', ')}`)
  }
  if (createdFiles.length > 0) {
    parts.push('', 'Created files:')
    for (const f of createdFiles) parts.push(`  - ${f}`)
  }

  parts.push(...formatSkipped(skipped))

  if (addedDeps.length > 0)
    parts.push('', 'Next: run `bun install` to install dependencies.')

  return parts.join('\n')
}

const registerAddTooling = (server: McpServer) => {
  server.registerTool(
    'add_tooling',
    {
      description:
        'Add @vitus-labs/tools packages to an existing project. Updates package.json with dependencies and scripts, and creates config files as needed.',
      inputSchema: {
        directory: absolutePath(
          'Absolute path to the project root (must contain package.json)',
        ),
        tools: z
          .array(z.enum(TOOLS))
          .describe(
            'Tools to add: typescript, lint, vitest, rolldown, rollup, nextjs, nextjs-images, storybook, favicon, atlas',
          ),
      },
    },
    async ({ directory, tools }) => {
      const pkgPath = join(directory, 'package.json')

      let pkgRaw: string
      try {
        pkgRaw = readFileSync(pkgPath, 'utf-8')
      } catch {
        return errorResult(
          `Error: No package.json found in ${directory}. Use scaffold_package to create a new project.`,
        )
      }

      let pkg: Record<string, unknown>
      try {
        pkg = JSON.parse(pkgRaw)
      } catch {
        return errorResult(`Error: ${pkgPath} is not valid JSON.`)
      }

      const allDeps: string[] = []
      const allScripts: string[] = []
      const allFiles: string[] = []
      const skipped: SkippedItems = { deps: [], scripts: [], files: [] }

      try {
        for (const tool of tools) {
          const result = applyToolAction(pkg, directory, getToolActions(tool))
          allDeps.push(...result.addedDeps)
          allScripts.push(...result.addedScripts)
          allFiles.push(...result.createdFiles)
          skipped.deps.push(...result.skipped.deps)
          skipped.scripts.push(...result.skipped.scripts)
          skipped.files.push(...result.skipped.files)
        }

        writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
      } catch (error) {
        return errorResult(
          `Error: failed to update ${directory}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: formatResult(tools, allDeps, allScripts, allFiles, skipped),
          },
        ],
      }
    },
  )
}

export type { SkippedItems }
export { applyToolAction, formatResult, getToolActions, registerAddTooling }
