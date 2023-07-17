#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
import { build } from '@storybook/core-server'
import { storybookBuild } from '../storybook/index.js'

build(storybookBuild)
