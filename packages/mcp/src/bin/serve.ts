#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from '../server.ts'

const server = createServer()
const transport = new StdioServerTransport()

await server.connect(transport)
console.error('@vitus-labs/tools-mcp running on stdio')
