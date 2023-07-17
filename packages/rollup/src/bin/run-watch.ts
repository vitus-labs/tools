#!/usr/bin/env node
const rollup = require('rollup')

const watchOptions = {}
const watcher = rollup.watch(watchOptions)

watcher.on('event', (event) => {
  // event.code can be one of:
  //   START        — the watcher is (re)starting
  //   BUNDLE_START — building an individual bundle
  //   BUNDLE_END   — finished building a bundle
  //   END          — finished building all bundles
  //   ERROR        — encountered an error while bundling
})

// stop watching
// watcher.close()
