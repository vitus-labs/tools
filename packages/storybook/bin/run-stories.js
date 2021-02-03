#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const storybook = require('@storybook/react/standalone')
const { storybookStandalone } = require('../src/storybook')

storybook(storybookStandalone)
