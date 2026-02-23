#!/usr/bin/env node
process.env.VL_MONOREPO = '1'

import { build } from 'storybook/internal/core-server'
import { storybookStandalone } from '../storybook/index.js'

build(storybookStandalone)
