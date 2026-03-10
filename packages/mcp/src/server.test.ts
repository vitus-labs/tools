import { describe, expect, it } from 'vitest'
import { createServer } from './server.js'

describe('createServer', () => {
  it('should create an MCP server instance', () => {
    const server = createServer()
    expect(server).toBeDefined()
  })
})
