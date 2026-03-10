# @vitus-labs/tools-mcp

MCP (Model Context Protocol) server for AI assistants to scaffold, configure, and diagnose @vitus-labs/tools projects.

Exposes 3 tools and 12 documentation resources over stdio transport, enabling Claude, Cursor, Copilot, and other MCP-compatible AI assistants to work with @vitus-labs/tools out of the box.

## Installation

```bash
bun add -d @vitus-labs/tools-mcp
```

## Usage

### As a CLI (stdio transport)

```bash
npx vl_mcp
```

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "vitus-labs-tools": {
      "command": "npx",
      "args": ["vl_mcp"]
    }
  }
}
```

### With Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "vitus-labs-tools": {
      "command": "npx",
      "args": ["vl_mcp"]
    }
  }
}
```

### Programmatic

```ts
import { createServer } from '@vitus-labs/tools-mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = createServer()
const transport = new StdioServerTransport()
await server.connect(transport)
```

## Tools

### `scaffold_package`

Scaffold a new project pre-configured with @vitus-labs/tools.

| Parameter | Type | Description |
|---|---|---|
| `name` | string | Package name (e.g. `@my-org/my-lib`) |
| `directory` | string | Absolute path to create the project in |
| `preset` | `library` \| `nextjs` \| `storybook` | Project type |

**Presets:**

- **library** — rolldown build, vitest, typescript, biome lint
- **nextjs** — Next.js app with @vitus-labs/tools-nextjs integration
- **storybook** — Storybook setup with @vitus-labs/tools-storybook

### `add_tooling`

Add @vitus-labs/tools packages to an existing project. Merges dependencies, scripts, and config files into the existing package.json.

| Parameter | Type | Description |
|---|---|---|
| `directory` | string | Absolute path to project root (must contain package.json) |
| `tools` | string[] | Tools to add: `typescript`, `lint`, `vitest`, `rolldown`, `rollup`, `nextjs`, `nextjs-images`, `storybook`, `favicon`, `atlas` |

### `diagnose_config`

Analyze a project for @vitus-labs/tools configuration issues.

| Parameter | Type | Description |
|---|---|---|
| `directory` | string | Absolute path to the project root to diagnose |

**Checks:**

| Check | Severity | Description |
|---|---|---|
| Missing package.json | error | No package.json found |
| Invalid JSON | error | package.json is not valid JSON |
| Missing ESM | warning | Missing `"type": "module"` |
| Missing tsconfig | warning | No tsconfig.json or non-standard extends |
| Missing Biome | warning | No biome.json (detects legacy ESLint) |
| Missing vl-tools.config | info | No vl-tools.config.mjs |
| Missing exports.types | warning | exports["."].types not set |
| Missing .js extensions | error | Relative imports without .js extension |
| Missing dependencies | error | Scripts reference tools not in dependencies |

## Resources

| URI | Description |
|---|---|
| `docs://vitus-labs/overview` | Overview of all packages with quick start |
| `docs://vitus-labs/packages/{name}` | Per-package documentation (core, rolldown, rollup, typescript, lint, vitest, nextjs, nextjs-images, storybook, favicon, atlas) |

## License

MIT
