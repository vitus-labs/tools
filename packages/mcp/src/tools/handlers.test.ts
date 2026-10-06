import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from '../server.ts'

interface ToolResult {
  isError?: boolean
  content: Array<{ text: string }>
}

describe('tool handlers', () => {
  let dir: string
  let client: Client

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mcp-int-'))
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test', version: '0.0.0' })
    await Promise.all([
      createServer().connect(serverTransport),
      client.connect(clientTransport),
    ])
  })

  afterEach(async () => {
    await client.close()
    rmSync(dir, { recursive: true, force: true })
  })

  const call = async (name: string, args: Record<string, unknown>) =>
    (await client.callTool({ name, arguments: args })) as unknown as ToolResult

  it('scaffold_package flags existing package.json as an error', async () => {
    writeFileSync(join(dir, 'package.json'), '{}')
    const res = await call('scaffold_package', {
      name: 'x',
      directory: dir,
      preset: 'library',
    })
    expect(res.isError).toBe(true)
    expect(res.content[0]?.text).toContain('already contains a package.json')
  })

  it('scaffold_package reports skipped files', async () => {
    writeFileSync(join(dir, 'biome.json'), '{}')
    const res = await call('scaffold_package', {
      name: 'x',
      directory: dir,
      preset: 'library',
    })
    expect(res.isError).toBeFalsy()
    expect(res.content[0]?.text).toContain('Skipped')
    expect(res.content[0]?.text).toContain('biome.json')
  })

  it('rejects relative directories', async () => {
    const res = await call('scaffold_package', {
      name: 'x',
      directory: 'relative/dir',
      preset: 'library',
    })
    expect(res.isError).toBe(true)
    expect(res.content[0]?.text).toContain('absolute')
  })

  it('rejects names that are not valid npm package names', async () => {
    const res = await call('scaffold_package', {
      name: "x'); process.exit(1); ('",
      directory: dir,
      preset: 'library',
    })
    expect(res.isError).toBe(true)
    expect(res.content[0]?.text).toContain('valid npm package name')
  })

  it('embeds the package name as a safe string literal', async () => {
    const res = await call('scaffold_package', {
      name: '@my-org/my-lib',
      directory: dir,
      preset: 'library',
    })
    expect(res.isError).toBeFalsy()
    const source = readFileSync(join(dir, 'src', 'index.ts'), 'utf8')
    expect(source).toContain('"Hello from @my-org\\u002Fmy-lib!"')
  })

  it('add_tooling errors without package.json', async () => {
    const res = await call('add_tooling', { directory: dir, tools: ['lint'] })
    expect(res.isError).toBe(true)
  })

  it('add_tooling errors on invalid package.json', async () => {
    writeFileSync(join(dir, 'package.json'), '{nope')
    const res = await call('add_tooling', { directory: dir, tools: ['lint'] })
    expect(res.isError).toBe(true)
    expect(res.content[0]?.text).toContain('not valid JSON')
  })

  it('diagnose_config errors without package.json', async () => {
    const res = await call('diagnose_config', { directory: dir })
    expect(res.isError).toBe(true)
  })

  it('diagnose_config does not flag findings as tool errors', async () => {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}')
    const res = await call('diagnose_config', { directory: dir })
    expect(res.isError).toBeFalsy()
  })
})
