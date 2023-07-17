#!/usr/bin/env node
import { build } from '@storybook/core-server'
import { storybookStandalone } from '../storybook/index.js'

build(storybookStandalone)
