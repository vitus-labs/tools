import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createServer } from './server.ts'

describe('createServer', () => {
  it('should create an MCP server instance', () => {
    const server = createServer()
    expect(server).toBeDefined()
  })

  it('should report the version from package.json', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
    )
    const server = createServer() as unknown as {
      server: { _serverInfo: { version: string } }
    }
    expect(server.server._serverInfo.version).toBe(pkg.version)
    expect(pkg.version).not.toBe('1.11.0')
  })
})
