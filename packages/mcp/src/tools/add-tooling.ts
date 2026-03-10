import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

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
          '@vitus-labs/tools-typescript': 'latest',
          typescript: '^5.9.0',
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
          '@vitus-labs/tools-lint': 'latest',
          '@biomejs/biome': '^2.4.0',
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
                $schema: 'https://biomejs.dev/schemas/2.4.4/schema.json',
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
          '@vitus-labs/tools-vitest': 'latest',
          vitest: '^4.0.0',
          '@vitest/coverage-v8': '^4.0.0',
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
        devDependencies: { '@vitus-labs/tools-rolldown': 'latest' },
        scripts: {
          build: 'vl_rolldown_build',
          dev: 'vl_rolldown_build-watch',
        },
      }
    case 'rollup':
      return {
        devDependencies: { '@vitus-labs/tools-rollup': 'latest' },
        scripts: { build: 'vl_build', dev: 'vl_build-watch' },
      }
    case 'nextjs':
      return {
        dependencies: { '@vitus-labs/tools-nextjs': 'latest' },
        files: [
          {
            path: 'next.config.ts',
            content: `import { withVitusLabs } from '@vitus-labs/tools-nextjs'\n\nexport default withVitusLabs({})\n`,
          },
        ],
      }
    case 'nextjs-images':
      return {
        dependencies: { '@vitus-labs/tools-nextjs-images': 'latest' },
      }
    case 'storybook':
      return {
        devDependencies: { '@vitus-labs/tools-storybook': 'latest' },
        scripts: {
          stories: 'vl_stories',
          'stories:build': 'vl_stories-build',
        },
      }
    case 'favicon':
      return {
        devDependencies: { '@vitus-labs/tools-favicon': 'latest' },
        scripts: { favicon: 'vl_favicon' },
      }
    case 'atlas':
      return {
        devDependencies: { '@vitus-labs/tools-atlas': 'latest' },
        scripts: { atlas: 'vl_atlas' },
      }
  }
}

const applyToolAction = (
  pkg: Record<string, unknown>,
  directory: string,
  actions: ToolAction,
) => {
  const addedDeps: string[] = []
  const addedScripts: string[] = []
  const createdFiles: string[] = []

  if (actions.dependencies) {
    const existing = (pkg.dependencies ?? {}) as Record<string, string>
    pkg.dependencies = { ...existing, ...actions.dependencies }
    addedDeps.push(...Object.keys(actions.dependencies))
  }

  if (actions.devDependencies) {
    const existing = (pkg.devDependencies ?? {}) as Record<string, string>
    pkg.devDependencies = { ...existing, ...actions.devDependencies }
    addedDeps.push(...Object.keys(actions.devDependencies))
  }

  if (actions.scripts) {
    const existing = (pkg.scripts ?? {}) as Record<string, string>
    pkg.scripts = { ...existing, ...actions.scripts }
    addedScripts.push(...Object.keys(actions.scripts))
  }

  if (actions.files) {
    for (const file of actions.files) {
      const filePath = join(directory, file.path)
      try {
        writeFileSync(filePath, file.content, { flag: 'wx' })
        createdFiles.push(file.path)
      } catch {
        // File already exists — skip
      }
    }
  }

  return { addedDeps, addedScripts, createdFiles }
}

const formatResult = (
  tools: readonly string[],
  addedDeps: string[],
  addedScripts: string[],
  createdFiles: string[],
) => {
  const parts: string[] = [
    `Added tools: ${tools.join(', ')}`,
    '',
    'Updated package.json:',
  ]

  if (addedDeps.length > 0)
    parts.push(`  Dependencies: ${addedDeps.join(', ')}`)
  if (addedScripts.length > 0)
    parts.push(`  Scripts: ${addedScripts.join(', ')}`)
  if (createdFiles.length > 0) {
    parts.push('', 'Created files:')
    for (const f of createdFiles) parts.push(`  - ${f}`)
  }
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
        directory: z
          .string()
          .describe(
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
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: No package.json found in ${directory}. Use scaffold_package to create a new project.`,
            },
          ],
        }
      }

      const pkg = JSON.parse(pkgRaw)
      const allDeps: string[] = []
      const allScripts: string[] = []
      const allFiles: string[] = []

      for (const tool of tools) {
        const result = applyToolAction(pkg, directory, getToolActions(tool))
        allDeps.push(...result.addedDeps)
        allScripts.push(...result.addedScripts)
        allFiles.push(...result.createdFiles)
      }

      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

      return {
        content: [
          {
            type: 'text' as const,
            text: formatResult(tools, allDeps, allScripts, allFiles),
          },
        ],
      }
    },
  )
}

export { applyToolAction, formatResult, getToolActions, registerAddTooling }
