# @vitus-labs/tools-atlas

Interactive dependency graph visualizer and monorepo health analyzer.

Generates a standalone HTML page with [ECharts](https://echarts.apache.org) charts (force, tree, matrix views) and AI-readable reports (Markdown/JSON) with actionable suggestions.

## Installation

```bash
bun add -d @vitus-labs/tools-atlas
```

## Usage

### CLI

Add to your `package.json`:

```json
{
  "scripts": {
    "atlas": "vl_atlas"
  }
}
```

Run it:

```bash
bun run atlas
```

### CLI Options

```
vl_atlas [options]
  -o, --output <path>         Output HTML path (default: ./atlas.html)
  -w, --workspaces <globs...> Workspace patterns
  --dep-types <types...>      Dependency types to include
  --include <patterns...>     Only include matching packages
  --exclude <patterns...>     Exclude matching packages
  --no-open                   Don't auto-open the HTML
  --title <title>             Page title
  --report <format>           Generate report: 'markdown' or 'json'
  --no-report                 Skip report generation
```

### Programmatic API

```ts
import { generateAtlas } from '@vitus-labs/tools-atlas'

await generateAtlas({
  workspaces: ['packages/*'],
  depTypes: ['dependencies', 'peerDependencies'],
  outputPath: './atlas.html',
  report: 'markdown',
})
```

## Configuration

Configure via `vl-tools.config.mjs` (key: `atlas`):

```js
export default {
  atlas: {
    workspaces: ['packages/*'],
    depTypes: ['dependencies', 'peerDependencies', 'devDependencies'],
    include: [],
    exclude: [],
    outputPath: './atlas.html',
    open: true,
    title: 'Atlas — Dependency Graph',
    report: 'markdown',
  },
}
```

| Option | Default | Description |
|---|---|---|
| `workspaces` | `['packages/*']` | Glob patterns for workspace directories |
| `depTypes` | `['dependencies', 'peerDependencies', 'devDependencies']` | Dependency types to include |
| `include` | `[]` | Only include packages matching these patterns |
| `exclude` | `[]` | Exclude packages matching these patterns |
| `outputPath` | `'./atlas.html'` | Output HTML file path |
| `open` | `true` | Auto-open the HTML in browser |
| `title` | `'Atlas — Dependency Graph'` | Page title |
| `report` | `'markdown'` | Report format: `'markdown'`, `'json'`, or `false` |

## Analysis

Atlas runs the following analyses on your monorepo:

| Analysis | Description |
|---|---|
| **Cycles** | Detects circular dependencies via DFS coloring |
| **Impact** | Maps transitive dependents via reverse BFS |
| **Depth** | Computes dependency chain depth and critical path |
| **Bundle Size** | Estimates `lib/` output sizes (own + transitive) |
| **Version Drift** | Flags external dependencies with mismatched versions across packages |
| **Health Score** | 0-100 score per package based on cycles, orphans, depth, drift |
| **Change Frequency** | Git commit frequency per package + hotspot detection |

## Visualization

The HTML output includes three switchable chart views:

- **Force** — Interactive force-directed graph. Nodes sized by impact, cycle nodes highlighted in red.
- **Tree** — Hierarchical DAG layout by dependency depth.
- **Matrix** — NxN heatmap showing dependency relationships.

Plus a sidebar with search/filter, dependency type legend, and analysis panels.

## Report

The generated report includes actionable suggestions:

- Cycle-breaking recommendations
- Deep chain flattening advice
- Orphan package warnings
- Version alignment suggestions
- Hotspot risk alerts (high-impact + high-churn packages)

## License

MIT
