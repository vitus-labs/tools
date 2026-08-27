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

Releases are managed via [Changesets](https://github.com/changesets/changesets) with
fixed versioning. All packages share the same version number and are always released
together.

- **Stable releases** are published from `main`
- **Prerelease versions** (`alpha`, `beta`) are published from `feature/*` and `release/*` branches

### Releasing

1. Add a changeset describing your change: `bun run changeset`
2. Merge the PR. A bot opens a **"chore: version packages"** PR with the version
   bumps and changelog entries.
3. Merge that PR. The packages are published to npm with
   [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers), and git
   tags plus GitHub releases are created.

### `RELEASE_TOKEN` (one-time setup)

Without this secret, the version PR is authored by `github-actions[bot]`. This
repository's Actions approval policy is `first_time_contributors`, which treats
that bot as a first-time contributor, so the version PR's CI runs sit in
`action_required` and the PR cannot be merged until a maintainer opens the
Actions tab and clicks **Approve and run** — every single release.

Loosening the approval policy is not the fix: this is a public repository and CI
runs `bun install` on pull request code, so install lifecycle scripts from a
stranger's fork would execute on the runners unreviewed. The gate is doing its
job; the bot should just not be the author.

To remove the friction, create a
[fine-grained personal access token](https://github.com/settings/personal-access-tokens)
scoped to this repository with:

| Permission | Access |
| --- | --- |
| Contents | Read and write |
| Pull requests | Read and write |

Add it as the repository secret **`RELEASE_TOKEN`**. The version PR is then
authored by that account, CI triggers on it normally, and no approval is needed.

If the secret is absent or its token expires, the workflow falls back to
`GITHUB_TOKEN` and releases keep working — they just need the manual approval
again, rather than failing. To approve from the terminal instead of the Actions
tab:

```sh
bun run release:approve
```

## Code Style

- Formatting and linting are handled by [Biome](https://biomejs.dev)
- Run `bun run format` before committing
- The CI pipeline checks formatting and linting on every push

## Reporting Issues

Please use [GitHub Issues](https://github.com/vitus-labs/tools/issues) to report bugs or request features.
