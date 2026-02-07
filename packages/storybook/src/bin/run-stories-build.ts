#!/usr/bin/env node
import { build } from 'storybook/internal/core-server'
import { storybookBuild } from '../storybook/index.js'

build(storybookBuild)
