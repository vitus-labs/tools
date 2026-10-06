import type { NextConfig } from 'next'
import { CONFIG } from './config/index.ts'
import { securityHeaders } from './headers.ts'

export { securityHeaders } from './headers.ts'
export type {
  HeadersConfig,
  NextjsToolsConfig,
  SecurityHeader,
} from './types.ts'

type NextConfigFunction = (
  phase: string,
  context: { defaultConfig: NextConfig },
) => NextConfig | Promise<NextConfig>

const applyDefaults = (nextConfig: NextConfig): NextConfig => ({
  ...nextConfig,
  images: {
    ...CONFIG.images,
    ...nextConfig.images,
  },
  transpilePackages: [
    ...CONFIG.transpilePackages,
    ...(nextConfig.transpilePackages ?? []),
  ],
  typescript: {
    ...CONFIG.typescript,
    ...nextConfig.typescript,
  },
  headers: async () => {
    const userHeaders = (await nextConfig.headers?.()) ?? []

    if (CONFIG.headers !== false) {
      return [...securityHeaders(CONFIG.headers), ...userHeaders]
    }

    return userHeaders
  },
})

/**
 * Wrap a Next.js config with vitus-labs defaults.
 *
 * Reads the `next` key from `vl-tools.config.mjs` and merges it
 * with the provided config. Adds security headers, image optimization,
 * and TypeScript build defaults. Accepts either a config object or a
 * config function `(phase, ctx) => config` (the function form returns a
 * function).
 */
export function withVitusLabs(nextConfig?: NextConfig): NextConfig
export function withVitusLabs(
  nextConfig: NextConfigFunction,
): (
  phase: string,
  context: { defaultConfig: NextConfig },
) => Promise<NextConfig>
export function withVitusLabs(
  nextConfig: NextConfig | NextConfigFunction = {},
): NextConfig | NextConfigFunction {
  if (typeof nextConfig === 'function') {
    return async (phase, context) =>
      applyDefaults(await nextConfig(phase, context))
  }

  return applyDefaults(nextConfig)
}
