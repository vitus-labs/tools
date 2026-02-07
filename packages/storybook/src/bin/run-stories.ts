#!/usr/bin/env node
import { build } from 'storybook/internal/core-server'
import { storybookStandalone } from '../storybook/index.js'

build(storybookStandalone)
