import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerDocs } from './resources/docs.js'
import { registerAddTooling } from './tools/add-tooling.js'
import { registerDiagnoseConfig } from './tools/diagnose-config.js'
import { registerScaffoldPackage } from './tools/scaffold-package.js'

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
