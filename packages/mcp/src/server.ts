import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerDocs } from './resources/docs.ts'
import { registerAddTooling } from './tools/add-tooling.ts'
import { registerDiagnoseConfig } from './tools/diagnose-config.ts'
import { registerScaffoldPackage } from './tools/scaffold-package.ts'

const createServer = () => {
  const server = new McpServer({
    name: '@vitus-labs/tools-mcp',
    version: '1.11.0',
  })

  registerScaffoldPackage(server)
  registerAddTooling(server)
  registerDiagnoseConfig(server)
  registerDocs(server)

  return server
}

export { createServer }
