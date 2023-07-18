#!/usr/bin/env node
import { build } from '@storybook/core-server'
import { storybookBuild } from '../storybook/index.js'

build(storybookBuild)
