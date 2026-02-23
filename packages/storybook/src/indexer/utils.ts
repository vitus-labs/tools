import { existsSync } from 'node:fs'
import path from 'node:path'
import { glob } from 'tinyglobby'

/**
 * Check if file uses the rocketstories pattern (stories.init() default export)
 */
export const isRocketstoriesPattern = (code: string): boolean =>
  /export\s+default\s+\w+\.init\(\)/.test(code)

/**
 * Check if a file exports a rocketstyle component.
 * Rocketstyle components use .config(), .theme(), .states(), .variants(), etc.
 */
export const isRocketstyleComponent = (code: string): boolean =>
  /\.(config|theme|states|variants|sizes|multiple|readOnly)\s*\(/.test(code)

/**
 * Check if a file exports a React component (FC, forwardRef, class, or default function)
 */
export const isReactComponent = (code: string): boolean =>
  /export\s+default\s/.test(code) &&
  (/\bFC\b/.test(code) ||
    /\bforwardRef\b/.test(code) ||
    /\bfunction\s+\w+/.test(code) ||
    /\bconst\s+\w+\s*[:=]/.test(code) ||
    isRocketstyleComponent(code))

/**
 * Extract all named exports from a story file.
 * Matches: export const Name = ...
 */
export const extractNamedExports = (code: string): string[] => {
  const matches = code.matchAll(/export\s+const\s+(\w+)\s*=/g)
  return Array.from(matches, (m) => m[1]).filter(
    (name): name is string => name !== undefined,
  )
}

/**
 * Extract explicit title from .config({ name: '...' }) in story file
 */
export const extractExplicitTitle = (code: string): string | null => {
  const match = code.match(/\.config\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/)
  return match?.[1] ?? null
}

/**
 * Extract component name from a story file's import.
 * Matches: import Badge from '..'
 *          import { Card } from '..'
 */
export const extractComponentName = (code: string): string | null => {
  // Default import: import Badge from '..'
  const defaultMatch = code.match(/import\s+(\w+)\s+from\s+['"]\.\.['"]/)
  if (defaultMatch?.[1]) return defaultMatch[1]

  // Named import: import { Card } from '..'
  const namedMatch = code.match(
    /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]\.\.['"]/,
  )
  return namedMatch?.[1] ?? null
}

/**
 * Prefix a title segment with a package name if available.
 */
const withPrefix = (prefix: string | null, title: string): string =>
  prefix ? `${prefix}/${title}` : title

/**
 * Extract the package prefix from a normalized file path.
 */
const extractPackagePrefix = (normalized: string): string | null =>
  normalized.match(/packages\/([\w-]+)\//)?.[1] ?? null

/**
 * Derive a title for a story file from its path.
 */
const deriveStoryTitle = (
  normalized: string,
  prefix: string | null,
): string | null => {
  // Story in __stories__ folder
  const storyMatch = normalized.match(
    /\/([^/]+)\/__stories__\/([^/]+)\.stories\.[jt]sx?$/,
  )
  if (storyMatch) {
    const parentDir = storyMatch[1] as string
    const storyName = storyMatch[2] as string
    // Badge/__stories__/Badge.stories.tsx -> Badge (main story)
    // Badge/__stories__/Composite.stories.tsx -> Badge/Composite (sub-story)
    const segment =
      storyName === parentDir ? parentDir : `${parentDir}/${storyName}`
    return withPrefix(prefix, segment)
  }

  // Story at package root: src/__stories__/Element.stories.tsx
  const rootMatch = normalized.match(
    /src\/__stories__\/([^/]+)\.stories\.[jt]sx?$/,
  )
  if (rootMatch?.[1]) return withPrefix(prefix, rootMatch[1])

  return null
}

/**
 * Derive a Storybook title from a file path.
 *
 * Component files:
 *   packages/ui-base/src/Badge/index.tsx         -> ui-base/Badge
 *   src/Button/index.tsx                         -> Button
 *
 * Story files:
 *   packages/ui-base/src/Badge/__stories__/Badge.stories.tsx      -> ui-base/Badge
 *   packages/ui-base/src/Badge/__stories__/Composite.stories.tsx  -> ui-base/Badge/Composite
 */
export const deriveTitle = (
  fileName: string,
  opts?: { isStoryFile?: boolean },
): string => {
  const normalized = fileName.replace(/\\/g, '/')
  const prefix = extractPackagePrefix(normalized)

  if (opts?.isStoryFile) {
    const storyTitle = deriveStoryTitle(normalized, prefix)
    if (storyTitle) return storyTitle
  }

  // Component file: extract from directory name
  const compMatch = normalized.match(/\/([^/]+)\/index\.[jt]sx?$/)
  if (compMatch?.[1]) return withPrefix(prefix, compMatch[1])

  // Fallback: use filename
  const baseName = path.basename(fileName).replace(/\.[jt]sx?$/, '')
  return withPrefix(prefix, baseName)
}

/**
 * Find all story files for a given component directory.
 * Returns empty array if no __stories__ folder exists.
 */
export const findManualStories = async (
  componentDir: string,
): Promise<string[]> => {
  const storiesDir = path.join(componentDir, '__stories__')

  if (!existsSync(storiesDir)) return []

  return glob(['*.stories.{ts,tsx,js,jsx}'], {
    cwd: storiesDir,
    absolute: true,
  })
}

/**
 * Detect component type from source code
 */
export type ComponentKind = 'rocketstyle' | 'react' | 'unknown'

export const detectComponentKind = (code: string): ComponentKind => {
  if (isRocketstyleComponent(code)) return 'rocketstyle'
  if (isReactComponent(code)) return 'react'
  return 'unknown'
}

/**
 * Extract rocketstyle dimension names from component source code.
 * Looks for .states(), .sizes(), .variants(), .multiple() calls.
 */
export const extractDimensionNames = (code: string): string[] => {
  const methodToDim: Record<string, string> = {
    states: 'state',
    sizes: 'size',
    variants: 'variant',
    multiple: 'multiple',
  }

  const matches = code.matchAll(/\.(states|sizes|variants|multiple)\s*\(/g)
  const dims: string[] = []

  for (const match of matches) {
    const key = match[1]
    if (key) {
      const dim = methodToDim[key]
      if (dim && !dims.includes(dim)) {
        dims.push(dim)
      }
    }
  }

  return dims
}
