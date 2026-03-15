import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const PRESETS = ['library', 'nextjs', 'storybook'] as const

const scaffoldLibrary = (dir: string, name: string) => {
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
    },
    devDependencies: {
      '@vitus-labs/tools-rolldown': 'latest',
      '@vitus-labs/tools-typescript': 'latest',
      '@vitus-labs/tools-lint': 'latest',
      '@vitus-labs/tools-vitest': 'latest',
      typescript: '^5.9.0',
    },
  }

  const tsconfig = {
    extends: '@vitus-labs/tools-typescript/lib',
    compilerOptions: {
      noEmit: false,
      outDir: 'lib',
      rootDir: 'src',
      baseUrl: '.',
      declarationDir: './lib/types',
    },
    include: ['src'],
    exclude: ['node_modules', 'lib', '**/*.test.ts'],
  }

  const biome = {
    $schema: 'https://biomejs.dev/schemas/2.4.7/schema.json',
    extends: ['@vitus-labs/tools-lint/biome'],
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

  const indexTs = `export const hello = () => 'Hello from ${name}!'
`

  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2))
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))
  writeFileSync(join(dir, 'biome.json'), JSON.stringify(biome, null, 2))
  writeFileSync(join(dir, 'vitest.config.ts'), vitestConfig)
  writeFileSync(join(dir, 'vl-tools.config.mjs'), vlConfig)

  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'index.ts'), indexTs)

  return [
    'package.json',
    'tsconfig.json',
    'biome.json',
    'vitest.config.ts',
    'vl-tools.config.mjs',
    'src/index.ts',
  ]
}

const scaffoldNextjs = (dir: string, name: string) => {
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
      next: 'latest',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      '@vitus-labs/tools-nextjs': 'latest',
    },
    devDependencies: {
      '@vitus-labs/tools-typescript': 'latest',
      '@vitus-labs/tools-lint': 'latest',
      '@types/react': '^19.0.0',
      typescript: '^5.9.0',
    },
  }

  const tsconfig = {
    extends: '@vitus-labs/tools-typescript/nextjs',
  }

  const biome = {
    $schema: 'https://biomejs.dev/schemas/2.4.7/schema.json',
    extends: ['@vitus-labs/tools-lint/biome'],
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

  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2))
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))
  writeFileSync(join(dir, 'biome.json'), JSON.stringify(biome, null, 2))
  writeFileSync(join(dir, 'next.config.ts'), nextConfig)
  writeFileSync(join(dir, 'vl-tools.config.mjs'), vlConfig)

  return [
    'package.json',
    'tsconfig.json',
    'biome.json',
    'next.config.ts',
    'vl-tools.config.mjs',
  ]
}

const scaffoldStorybook = (dir: string, name: string) => {
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
      '@vitus-labs/tools-storybook': 'latest',
      '@vitus-labs/tools-lint': 'latest',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
  }

  const biome = {
    $schema: 'https://biomejs.dev/schemas/2.4.7/schema.json',
    extends: ['@vitus-labs/tools-lint/biome'],
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

  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2))
  writeFileSync(join(dir, 'biome.json'), JSON.stringify(biome, null, 2))
  writeFileSync(join(dir, 'vl-tools.config.mjs'), vlConfig)

  mkdirSync(join(dir, '.storybook'), { recursive: true })
  writeFileSync(join(dir, '.storybook', 'main.ts'), mainTs)
  writeFileSync(join(dir, '.storybook', 'preview.ts'), previewTs)

  return [
    'package.json',
    'biome.json',
    'vl-tools.config.mjs',
    '.storybook/main.ts',
    '.storybook/preview.ts',
  ]
}

const registerScaffoldPackage = (server: McpServer) => {
  server.registerTool(
    'scaffold_package',
    {
      description:
        'Scaffold a new project pre-configured with @vitus-labs/tools. Creates all config files (package.json, tsconfig, biome, vitest, vl-tools.config.mjs) for the selected preset.',
      inputSchema: {
        name: z.string().describe('Package name (e.g. @my-org/my-lib)'),
        directory: z
          .string()
          .describe('Absolute path to create the project in'),
        preset: z
          .enum(PRESETS)
          .describe(
            'Project type: "library" (rolldown + vitest), "nextjs" (Next.js app), "storybook" (Storybook setup)',
          ),
      },
    },
    async ({ name, directory, preset }) => {
      try {
        readFileSync(join(directory, 'package.json'))
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${directory} already contains a package.json. Use add_tooling instead to add tools to an existing project.`,
            },
          ],
        }
      } catch {
        // No package.json — safe to scaffold
      }

      mkdirSync(directory, { recursive: true })

      let files: string[]

      switch (preset) {
        case 'library':
          files = scaffoldLibrary(directory, name)
          break
        case 'nextjs':
          files = scaffoldNextjs(directory, name)
          break
        case 'storybook':
          files = scaffoldStorybook(directory, name)
          break
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Scaffolded ${preset} project "${name}" in ${directory}\n\nCreated files:\n${files.map((f) => `  - ${f}`).join('\n')}\n\nNext steps:\n1. cd ${directory}\n2. bun install\n3. ${preset === 'library' ? 'bun run build' : preset === 'nextjs' ? 'bun run dev' : 'bun run stories'}`,
          },
        ],
      }
    },
  )
}

export {
  registerScaffoldPackage,
  scaffoldLibrary,
  scaffoldNextjs,
  scaffoldStorybook,
}
