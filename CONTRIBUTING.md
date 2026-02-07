# Contributing

Thanks for your interest in contributing to `@vitus-labs/tools`.

## Development Setup

1. **Clone the repo**

   ```bash
   git clone git@github.com:vitus-labs/tools.git
   cd tools
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Build all packages**

   ```bash
   bun run pkgs:build
   ```

## Project Structure

```text
packages/
  core/         - Shared utilities (config loading, package metadata)
  typescript/   - Shared TypeScript configuration
  lint/         - Shared Biome configuration
  rollup/       - Rollup-based build tooling
  rolldown/     - Rolldown-based build tooling
  storybook/    - Shared Storybook configuration
  favicon/      - Favicon generation CLI
```

## Workflow

1. Create a branch from `main`:

   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes.

3. Ensure code quality:

   ```bash
   bun run format
   bun run lint
   bun run pkgs:build
   ```

4. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org):

   ```text
   feat: add new feature
   fix: resolve issue with X
   chore: update dependencies
   ```

5. Open a pull request against `main`.

## Publishing

Releases are managed via [Lerna](https://lerna.js.org) with fixed versioning. All packages share the same version number.

- **Stable releases** are published from `main`
- **Prerelease versions** (`alpha`, `beta`) can be published from `feature/*` and `release/*` branches

## Code Style

- Formatting and linting are handled by [Biome](https://biomejs.dev)
- Run `bun run format` before committing
- The CI pipeline checks formatting and linting on every push

## Reporting Issues

Please use [GitHub Issues](https://github.com/vitus-labs/tools/issues) to report bugs or request features.
