import type { NextConfig } from 'next'

export interface SecurityHeader {
  key: string
  value: string
}

export type HeadersConfig =
  | boolean
  | Record<string, string>
  | ((defaults: SecurityHeader[]) => SecurityHeader[])

export interface NextjsToolsConfig {
  /**
   * Security headers configuration (default: true).
   * - `true` — apply all default security headers
   * - `false` — disable security headers
   * - `Record<string, string>` — override specific header values
   * - `(defaults) => headers[]` — full control via callback
   */
  headers?: HeadersConfig
  /** Next.js image optimization config */
  images?: NextConfig['images']
  /** Packages to transpile in monorepo */
  transpilePackages?: string[]
  /** TypeScript build config (default: { ignoreBuildErrors: false }) */
  typescript?: NextConfig['typescript']
}

export interface VLToolsConfig {
  next?: NextjsToolsConfig
  [key: string]: unknown
}
