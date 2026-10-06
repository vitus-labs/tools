#!/usr/bin/env node
// Static imports are hoisted above this assignment, and `config/index.ts`
// reads VL_MONOREPO at module load — so the modules that depend on it must
// be imported dynamically, after the variable is set.
process.env.VL_MONOREPO = '1'

const { build } = await import('storybook/internal/core-server')
const { storybookStandalone } = await import('../storybook/index.ts')

build(storybookStandalone)
