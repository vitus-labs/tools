import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { BIOME_SCHEMA, VERSIONS } from '../versions.ts'
import { absolutePath, errorResult, writeIfMissing } from './utils.ts'

const PRESETS = ['library', 'nextjs', 'storybook'] as const

interface ScaffoldResult {
  created: string[]
  skipped: string[]
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

/** Write files without overwriting existing ones; keys are relative paths. */
const writeFiles = (dir: string, files: [string, string][]): ScaffoldResult => {
  const result: ScaffoldResult = { created: [], skipped: [] }

  for (const [rel, content] of files) {
    const target = join(dir, rel)
    mkdirSync(dirname(target), { recursive: true })
    if (writeIfMissing(target, content)) result.created.push(rel)
    else result.skipped.push(rel)
  }

  return result
}

const biomeConfig = () =>
  json({
    $schema: BIOME_SCHEMA,
    extends: ['@vitus-labs/tools-lint/biome'],
  })

const scaffoldLibrary = (dir: string, name: string): ScaffoldResult => {
  const pkgJson = {
    name,
    version: '0.0.0',
    license: 'MIT',
    type: 'module',
    exports: {
      '.': {
        import: './lib/index.js',
        types: './lib/types/index.d.ts',
      },
    },
    scripts: {
      build: 'vl_rolldown_build',
      dev: 'vl_rolldown_build-watch',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
    },
    devDependencies: {
      '@vitus-labs/tools-rolldown': VERSIONS.vitusLabs,
      '@vitus-labs/tools-typescript': VERSIONS.vitusLabs,
      '@vitus-labs/tools-lint': VERSIONS.vitusLabs,
      '@vitus-labs/tools-vitest': VERSIONS.vitusLabs,
      '@biomejs/biome': VERSIONS.biome,
      '@vitest/coverage-v8': VERSIONS.vitestCoverage,
      typescript: VERSIONS.typescript,
      vite: VERSIONS.vite,
      vitest: VERSIONS.vitest,
    },
  }

  const tsconfig = {
    extends: '@vitus-labs/tools-typescript/lib',
    compilerOptions: {
      noEmit: false,
      outDir: 'lib',
      rootDir: 'src',
      declarationDir: './lib/types',
    },
    include: ['src'],
    exclude: ['node_modules', 'lib', '**/*.test.ts'],
  }

  const vitestConfig = `import { createVitestConfig } from '@vitus-labs/tools-vitest'

export default createVitestConfig()
`

  const vlConfig = `export default {
  build: {
    sourceDir: 'src',
    outputDir: 'lib',
    typescript: true,
  },
}
`

  const indexTs = `export const hello = () => ${JSON.stringify(`Hello from ${name}!`)}
`

  return writeFiles(dir, [
    ['package.json', json(pkgJson)],
    ['tsconfig.json', json(tsconfig)],
    ['biome.json', biomeConfig()],
    ['vitest.config.ts', vitestConfig],
    ['vl-tools.config.mjs', vlConfig],
    ['src/index.ts', indexTs],
  ])
}

const scaffoldNextjs = (dir: string, name: string): ScaffoldResult => {
  const pkgJson = {
    name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      next: VERSIONS.next,
      react: VERSIONS.react,
      'react-dom': VERSIONS.reactDom,
      '@vitus-labs/tools-nextjs': VERSIONS.vitusLabs,
    },
    devDependencies: {
      '@vitus-labs/tools-typescript': VERSIONS.vitusLabs,
      '@vitus-labs/tools-lint': VERSIONS.vitusLabs,
      '@biomejs/biome': VERSIONS.biome,
      '@types/react': VERSIONS.typesReact,
      typescript: VERSIONS.typescript,
    },
  }

  const tsconfig = {
    extends: '@vitus-labs/tools-typescript/nextjs',
  }

  const nextConfig = `import { withVitusLabs } from '@vitus-labs/tools-nextjs'

export default withVitusLabs({})
`

  const vlConfig = `export default {
  next: {
    headers: true,
  },
}
`

  return writeFiles(dir, [
    ['package.json', json(pkgJson)],
    ['tsconfig.json', json(tsconfig)],
    ['biome.json', biomeConfig()],
    ['next.config.ts', nextConfig],
    ['vl-tools.config.mjs', vlConfig],
  ])
}

const scaffoldStorybook = (dir: string, name: string): ScaffoldResult => {
  const pkgJson = {
    name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      stories: 'vl_stories',
      'stories:build': 'vl_stories-build',
    },
    devDependencies: {
      '@vitus-labs/tools-storybook': VERSIONS.vitusLabs,
      '@vitus-labs/tools-lint': VERSIONS.vitusLabs,
      '@biomejs/biome': VERSIONS.biome,
      react: VERSIONS.react,
      'react-dom': VERSIONS.reactDom,
    },
  }

  const vlConfig = `export default {
  stories: {
    framework: 'vite',
  },
}
`

  const mainTs = `export { default } from '@vitus-labs/tools-storybook/storybook/main'
`
  const previewTs = `export { default } from '@vitus-labs/tools-storybook/storybook/preview'
`

  return writeFiles(dir, [
    ['package.json', json(pkgJson)],
    ['biome.json', biomeConfig()],
    ['vl-tools.config.mjs', vlConfig],
    ['.storybook/main.ts', mainTs],
    ['.storybook/preview.ts', previewTs],
  ])
}

const PRESET_SCAFFOLDERS: Record<
  (typeof PRESETS)[number],
  (dir: string, name: string) => ScaffoldResult
> = {
  library: scaffoldLibrary,
  nextjs: scaffoldNextjs,
  storybook: scaffoldStorybook,
}

const PRESET_FIRST_COMMAND: Record<(typeof PRESETS)[number], string> = {
  library: 'bun run build',
  nextjs: 'bun run dev',
  storybook: 'bun run stories',
}

const registerScaffoldPackage = (server: McpServer) => {
  server.registerTool(
    'scaffold_package',
    {
      description:
        'Scaffold a new project pre-configured with @vitus-labs/tools. Creates all config files (package.json, tsconfig, biome, vitest, vl-tools.config.mjs) for the selected preset. Existing files are never overwritten.',
      inputSchema: {
        name: z.string().min(1).describe('Package name (e.g. @my-org/my-lib)'),
        directory: absolutePath('Absolute path to create the project in'),
        preset: z
          .enum(PRESETS)
          .describe(
            'Project type: "library" (rolldown + vitest), "nextjs" (Next.js app), "storybook" (Storybook setup)',
          ),
      },
    },
    async ({ name, directory, preset }) => {
      if (existsSync(join(directory, 'package.json'))) {
        return errorResult(
          `Error: ${directory} already contains a package.json. Use add_tooling instead to add tools to an existing project.`,
        )
      }

      let result: ScaffoldResult
      try {
        mkdirSync(directory, { recursive: true })

        result = PRESET_SCAFFOLDERS[preset](directory, name)
      } catch (error) {
        return errorResult(
          `Error: failed to scaffold ${preset} project in ${directory}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      const lines = [
        `Scaffolded ${preset} project "${name}" in ${directory}`,
        '',
        'Created files:',
        ...result.created.map((f) => `  - ${f}`),
      ]
      if (result.skipped.length > 0) {
        lines.push(
          '',
          'Skipped (already exist, left untouched):',
          ...result.skipped.map((f) => `  - ${f}`),
        )
      }
      lines.push(
        '',
        'Next steps:',
        `1. cd ${directory}`,
        '2. bun install',
        `3. ${PRESET_FIRST_COMMAND[preset]}`,
      )

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
    },
  )
}

export type { ScaffoldResult }
export {
  registerScaffoldPackage,
  scaffoldLibrary,
  scaffoldNextjs,
  scaffoldStorybook,
}
