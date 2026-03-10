import { accessSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

interface Issue {
  severity: 'error' | 'warning' | 'info'
  message: string
  fix?: string
}

const SEVERITY_ICON = { error: '[ERROR]', warning: '[WARN]', info: '[INFO]' }

const fileExists = (filePath: string): boolean => {
  try {
    accessSync(filePath)
    return true
  } catch {
    return false
  }
}

const readJson = (filePath: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

const checkEsm = (pkg: Record<string, unknown>): Issue[] => {
  if (pkg.type !== 'module') {
    return [
      {
        severity: 'warning',
        message: 'package.json is missing "type": "module"',
        fix: 'Add "type": "module" to package.json for ESM support',
      },
    ]
  }
  return []
}

const checkTsConfig = (directory: string): Issue[] => {
  const tsConfigPath = join(directory, 'tsconfig.json')
  if (!fileExists(tsConfigPath)) {
    return [
      {
        severity: 'warning',
        message: 'No tsconfig.json found',
        fix: 'Create tsconfig.json extending @vitus-labs/tools-typescript/lib',
      },
    ]
  }

  const tsConfig = readJson(tsConfigPath)
  if (!tsConfig) return []

  const ext = tsConfig.extends as string | undefined
  if (ext && !ext.includes('@vitus-labs/tools-typescript')) {
    return [
      {
        severity: 'info',
        message: `tsconfig.json extends "${ext}" instead of @vitus-labs/tools-typescript`,
        fix: 'Consider using @vitus-labs/tools-typescript/lib or /nextjs preset',
      },
    ]
  }

  return []
}

const checkBiome = (directory: string): Issue[] => {
  const hasBiome = ['biome.json', 'biome.jsonc'].some((f) =>
    fileExists(join(directory, f)),
  )
  if (hasBiome) return []

  const hasEslint = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yml',
  ].some((f) => fileExists(join(directory, f)))

  if (hasEslint) {
    return [
      {
        severity: 'info',
        message: 'Project uses ESLint. @vitus-labs/tools uses Biome instead',
        fix: 'Create biome.json extending @vitus-labs/tools-lint/biome and remove ESLint config',
      },
    ]
  }

  return [
    {
      severity: 'warning',
      message: 'No Biome config found',
      fix: 'Create biome.json extending @vitus-labs/tools-lint/biome',
    },
  ]
}

const checkVlConfig = (directory: string): Issue[] => {
  if (!fileExists(join(directory, 'vl-tools.config.mjs'))) {
    return [
      {
        severity: 'info',
        message:
          'No vl-tools.config.mjs found (optional — used by build, storybook, nextjs, favicon, atlas)',
      },
    ]
  }
  return []
}

const checkExports = (pkg: Record<string, unknown>): Issue[] => {
  const issues: Issue[] = []
  const exports = pkg.exports as Record<string, unknown> | undefined
  if (!exports) return []

  const dotExport = exports['.'] as Record<string, unknown> | undefined
  if (!dotExport) return []

  if (!dotExport.types) {
    issues.push({
      severity: 'warning',
      message:
        'exports["."].types is missing — consumers won\'t get TypeScript types',
      fix: 'Add "types": "./lib/types/index.d.ts" to exports["."]',
    })
  }
  if (!dotExport.import) {
    issues.push({
      severity: 'warning',
      message: 'exports["."].import is missing',
      fix: 'Add "import": "./lib/index.js" to exports["."]',
    })
  }

  return issues
}

const findTsFiles = (dir: string, files: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (
      entry.isDirectory() &&
      entry.name !== 'node_modules' &&
      entry.name !== 'lib'
    ) {
      findTsFiles(full, files)
    } else if (
      entry.isFile() &&
      /\.tsx?$/.test(entry.name) &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(full)
    }
  }
  return files
}

const checkEsmImports = (directory: string): Issue[] => {
  const srcDir = join(directory, 'src')
  if (!fileExists(srcDir)) return []

  const issues: Issue[] = []
  const tsFiles = findTsFiles(srcDir)

  for (const file of tsFiles.slice(0, 20)) {
    const content = readFileSync(file, 'utf-8')
    const relativeImports = content.match(/from\s+['"]\..*?['"]/g) || []
    for (const imp of relativeImports) {
      if (!imp.includes('.js') && !imp.includes('.json')) {
        issues.push({
          severity: 'error',
          message: `Missing .js extension in relative import: ${imp} (${file.replace(directory, '.')})`,
          fix: 'ESM requires .js extensions on relative imports (e.g., from "./foo.js")',
        })
        break
      }
    }
  }

  return issues
}

const SCRIPT_DEP_MAP: Array<{ pattern: string; dep: string }> = [
  { pattern: 'vl_build', dep: '@vitus-labs/tools-rollup' },
  { pattern: 'vl_rolldown', dep: '@vitus-labs/tools-rolldown' },
  { pattern: 'vl_stories', dep: '@vitus-labs/tools-storybook' },
]

const checkMissingDeps = (pkg: Record<string, unknown>): Issue[] => {
  const devDeps = (pkg.devDependencies || {}) as Record<string, string>
  const deps = (pkg.dependencies || {}) as Record<string, string>
  const allDeps = { ...deps, ...devDeps }

  const scripts = (pkg.scripts || {}) as Record<string, string>
  const scriptValues = Object.values(scripts).join(' ')

  return SCRIPT_DEP_MAP.filter(
    ({ pattern, dep }) => scriptValues.includes(pattern) && !allDeps[dep],
  ).map(({ pattern, dep }) => ({
    severity: 'error' as const,
    message: `Scripts reference ${pattern} but ${dep} is not installed`,
    fix: `Run \`bun add -d ${dep}\``,
  }))
}

const diagnose = (directory: string): Issue[] => {
  const pkgPath = join(directory, 'package.json')

  if (!fileExists(pkgPath)) {
    return [
      {
        severity: 'error',
        message: 'No package.json found',
        fix: 'Run `bun init` or use the scaffold_package tool',
      },
    ]
  }

  const pkg = readJson(pkgPath) as Record<string, unknown> | null
  if (!pkg) {
    return [{ severity: 'error', message: 'package.json is not valid JSON' }]
  }

  const issues = [
    ...checkEsm(pkg),
    ...checkTsConfig(directory),
    ...checkBiome(directory),
    ...checkVlConfig(directory),
    ...checkExports(pkg),
    ...checkEsmImports(directory),
    ...checkMissingDeps(pkg),
  ]

  if (issues.length === 0) {
    issues.push({
      severity: 'info',
      message: 'No issues found — configuration looks good!',
    })
  }

  return issues
}

const registerDiagnoseConfig = (server: McpServer) => {
  server.registerTool(
    'diagnose_config',
    {
      description:
        'Analyze a project for @vitus-labs/tools configuration issues. Checks package.json, tsconfig, biome, ESM imports, missing dependencies, and more.',
      inputSchema: {
        directory: z
          .string()
          .describe('Absolute path to the project root to diagnose'),
      },
    },
    async ({ directory }) => {
      const issues = diagnose(directory)

      const text = issues
        .map((i) => {
          let line = `${SEVERITY_ICON[i.severity]} ${i.message}`
          if (i.fix) line += `\n  Fix: ${i.fix}`
          return line
        })
        .join('\n\n')

      const errors = issues.filter((i) => i.severity === 'error').length
      const warnings = issues.filter((i) => i.severity === 'warning').length

      const summary = `\n---\nSummary: ${errors} error(s), ${warnings} warning(s), ${issues.length} total issue(s)`

      return {
        content: [{ type: 'text' as const, text: text + summary }],
      }
    },
  )
}

export { diagnose, registerDiagnoseConfig }
