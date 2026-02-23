#!/usr/bin/env node
process.env.VL_MONOREPO = '1'

import { build } from 'storybook/internal/core-server'
import { storybookBuild } from '../storybook/index.js'

build(storybookBuild)
