import { accessSync, type Dirent, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { absolutePath } from './utils.ts'

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

/**
 * Remove comments and trailing commas from JSONC text (e.g. tsconfig.json)
 * without touching anything inside string literals.
 */
const COMMENTS_AND_STRINGS = /"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g
const TRAILING_COMMAS_AND_STRINGS = /"(?:[^"\\]|\\.)*"|,(?=\s*[}\]])/g

const stripJsonc = (text: string): string =>
  text
    .replace(/^﻿/, '')
    .replace(COMMENTS_AND_STRINGS, (m) => (m.startsWith('"') ? m : ' '))
    .replace(TRAILING_COMMAS_AND_STRINGS, (m) => (m === ',' ? '' : m))

const readJsonc = (filePath: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(stripJsonc(readFileSync(filePath, 'utf-8')))
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

  const tsConfig = readJsonc(tsConfigPath)
  if (!tsConfig) return []

  // `extends` may be a string or (TS 5+) an array of strings
  const rawExtends = tsConfig.extends
  const extendsList = (
    Array.isArray(rawExtends) ? rawExtends : [rawExtends]
  ).filter((e): e is string => typeof e === 'string' && e.length > 0)

  if (
    extendsList.length > 0 &&
    !extendsList.some((e) => e.includes('@vitus-labs/tools-typescript'))
  ) {
    return [
      {
        severity: 'info',
        message: `tsconfig.json extends ${extendsList.map((e) => `"${e}"`).join(', ')} instead of @vitus-labs/tools-typescript`,
        fix: 'Consider using @vitus-labs/tools-typescript/lib, /node or /nextjs preset',
      },
    ]
  }

  return []
}

const ESLINT_CONFIGS = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  ...['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((e) => `eslint.config.${e}`),
]

const checkBiome = (directory: string): Issue[] => {
  const hasBiome = ['biome.json', 'biome.jsonc'].some((f) =>
    fileExists(join(directory, f)),
  )
  if (hasBiome) return []

  const hasEslint = ESLINT_CONFIGS.some((f) => fileExists(join(directory, f)))

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

const SOURCE_FILE = /\.(tsx?|mts|cts)$/
const EXCLUDED_SOURCE_FILE =
  /(\.d\.(ts|mts|cts)|\.(test|spec)\.(tsx?|mts|cts))$/

// Only dependency folders are skipped: `src/lib/**` is regular source code
// (build output lives at the project root, outside the scanned `src`).
const findTsFiles = (dir: string, files: string[] = []): string[] => {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') findTsFiles(full, files)
    } else if (
      entry.isFile() &&
      SOURCE_FILE.test(entry.name) &&
      !EXCLUDED_SOURCE_FILE.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

const MAX_IMPORT_ISSUES = 20

// Extensions that make a relative specifier explicit (code, data, assets)
const KNOWN_EXTENSION =
  /\.(m?[jt]sx?|c[jt]s|json|node|wasm|css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|html?|mdx?|txt|ya?ml|csv|woff2?|ttf|otf|eot|mp[34]|webm)$/i

const RELATIVE_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.{1,2}(?:\/[^'"\n]*)?)\1/g

const hasExplicitExtension = (specifier: string): boolean =>
  KNOWN_EXTENSION.test(specifier.split(/[?#]/)[0] ?? specifier)

const checkEsmImports = (directory: string): Issue[] => {
  const srcDir = join(directory, 'src')
  if (!fileExists(srcDir)) return []

  const issues: Issue[] = []
  let total = 0

  for (const file of findTsFiles(srcDir)) {
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      continue
    }

    const seen = new Set<string>()
    for (const match of content.matchAll(RELATIVE_SPECIFIER)) {
      const specifier = match[2] as string
      if (hasExplicitExtension(specifier) || seen.has(specifier)) continue
      seen.add(specifier)
      total++

      if (issues.length < MAX_IMPORT_ISSUES) {
        issues.push({
          severity: 'error',
          message: `Missing extension in relative import: '${specifier}' (${file.replace(directory, '.')})`,
          fix: 'ESM requires explicit extensions on relative imports — use ".ts"/".tsx" with rewriteRelativeImportExtensions, or ".js"',
        })
      }
    }
  }

  if (total > issues.length) {
    issues.push({
      severity: 'error',
      message: `...and ${total - issues.length} more relative import(s) without an extension`,
    })
  }

  return issues
}

const SCRIPT_DEP_MAP: Array<{ pattern: string; dep: string }> = [
  { pattern: 'vl_build', dep: '@vitus-labs/tools-rollup' },
  { pattern: 'vl_rolldown', dep: '@vitus-labs/tools-rolldown' },
  // also matches vl_stories-build, vl_stories-monorepo[-build]
  { pattern: 'vl_stories', dep: '@vitus-labs/tools-storybook' },
  { pattern: 'vl_favicon', dep: '@vitus-labs/tools-favicon' },
  { pattern: 'vl_atlas', dep: '@vitus-labs/tools-atlas' },
  { pattern: 'vl_mcp', dep: '@vitus-labs/tools-mcp' },
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
        directory: absolutePath(
          'Absolute path to the project root to diagnose',
        ),
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

      // Findings are a normal result; only an unusable project (no readable
      // package.json) means the diagnosis itself could not run.
      const unusable =
        !fileExists(join(directory, 'package.json')) ||
        !readJson(join(directory, 'package.json'))

      return {
        ...(unusable ? { isError: true as const } : {}),
        content: [{ type: 'text' as const, text: text + summary }],
      }
    },
  )
}

export { diagnose, registerDiagnoseConfig, stripJsonc }
