#!/usr/bin/env node
// See run-stories-monorepo.ts — env must be set before config is loaded.
process.env.VL_MONOREPO = '1'

const { build } = await import('storybook/internal/core-server')
const { storybookBuild } = await import('../storybook/index.ts')

build(storybookBuild)
