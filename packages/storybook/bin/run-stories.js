#!/usr/bin/env node
const storybook = require('@storybook/react/standalone')
const { storybookStandalone } = require('../lib/vitus-labs-tools-storybook')

storybook(storybookStandalone)
