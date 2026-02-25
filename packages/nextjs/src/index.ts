import type { NextConfig } from 'next'
import { CONFIG } from './config/index'
import { securityHeaders } from './headers'

export { securityHeaders } from './headers'
export type {
  HeadersConfig,
  NextjsToolsConfig,
  SecurityHeader,
} from './types'

/**
 * Wrap a Next.js config with vitus-labs defaults.
 *
 * Reads the `next` key from `vl-tools.config.mjs` and merges it
 * with the provided config. Adds security headers, image optimization,
 * and sensible TypeScript/ESLint defaults.
 */
export const withVitusLabs = (nextConfig: NextConfig = {}): NextConfig => ({
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
