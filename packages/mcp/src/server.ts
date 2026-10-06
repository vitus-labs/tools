import { createRequire } from 'node:module'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerDocs } from './resources/docs.ts'
import { registerAddTooling } from './tools/add-tooling.ts'
import { registerDiagnoseConfig } from './tools/diagnose-config.ts'
import { registerScaffoldPackage } from './tools/scaffold-package.ts'

// src/ and lib/ both sit one level below the package root
const { version } = createRequire(import.meta.url)('../package.json') as {
  version: string
}

const createServer = () => {
  const server = new McpServer({
    name: '@vitus-labs/tools-mcp',
    version,
  })

  registerScaffoldPackage(server)
  registerAddTooling(server)
  registerDiagnoseConfig(server)
  registerDocs(server)

  return server
}

export { createServer }
