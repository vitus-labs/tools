import type { DepNode } from '../types.ts'

export interface PackageJson {
  name?: string
  version?: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/**
 * Parsed package.json per scanned node. Kept out of `DepNode` itself so
 * manifests are never serialized into the HTML/JSON output.
 */
export const manifests = new WeakMap<DepNode, PackageJson>()
