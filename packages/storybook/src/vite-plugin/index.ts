import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'
import { VIRTUAL_STORY_PREFIX } from '../indexer/index.js'
import { detectComponentKind, extractDimensionNames } from '../indexer/utils.js'

const RESOLVE_PREFIX = VIRTUAL_STORY_PREFIX
const VIRTUAL_PREFIX = `\0${VIRTUAL_STORY_PREFIX}`

interface RocketstoriesConfig {
  module: string
  export: string
}

/**
 * Generate a story module for a rocketstyle component.
 */
const generateRocketstyleStory = (
  componentPath: string,
  dimensions: string[],
  componentName: string,
  rs: RocketstoriesConfig,
): string => {
  const dimExports = dimensions.map((dim) => {
    const exportName = `${dim.charAt(0).toUpperCase() + dim.slice(1)}s`
    return `export const ${exportName} = stories.dimension('${dim}')`
  })

  return `
import { ${rs.export} } from '${rs.module}'
import Component from '${componentPath}'

const stories = ${rs.export}(Component)
  .attrs({ label: '${componentName}' })

export default stories.init
export const Default = stories.main()
${dimExports.join('\n')}
export const PseudoStates = stories.render((props) => {
  const states = ['normal', 'hover', 'focus', 'active', 'disabled']

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {states.map((state) => (
        <div
          key={state}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <div
            {...(state !== 'normal' ? { 'data-pseudo': state } : {})}
            {...(state === 'disabled' ? { 'data-disabled': true } : {})}
          >
            <Component
              {...props}
              label="${componentName}"
              {...(state === 'disabled' ? { disabled: true } : {})}
            />
          </div>
          <code style={{ fontSize: 11, opacity: 0.6 }}>{state}</code>
        </div>
      ))}
    </div>
  )
})
`
}

/**
 * Generate a story module for a plain React component.
 */
const generatePlainStory = (
  componentPath: string,
  componentName: string,
): string => `
import Component from '${componentPath}'

export default {
  title: '${componentName}',
  component: Component,
}

export const Default = {
  render: (args) => <Component {...args} />,
}
`

/**
 * Vite plugin that resolves virtual story modules for auto-discovered
 * components. Works with the auto-discovery indexer.
 */
export const rocketstoriesVitePlugin = (rs: RocketstoriesConfig): Plugin => ({
  name: 'vite-plugin-rocketstories',

  resolveId(id) {
    if (id.startsWith(RESOLVE_PREFIX)) {
      return VIRTUAL_PREFIX + id.slice(RESOLVE_PREFIX.length)
    }
  },

  async load(id) {
    if (!id.startsWith(VIRTUAL_PREFIX)) return

    const componentPath = id.slice(VIRTUAL_PREFIX.length)
    const code = await readFile(componentPath, 'utf-8')
    const kind = detectComponentKind(code)

    // Extract component name from directory
    const componentName = path.basename(path.dirname(componentPath))

    if (kind === 'rocketstyle') {
      const dimensions = extractDimensionNames(code)
      return generateRocketstyleStory(
        componentPath,
        dimensions,
        componentName,
        rs,
      )
    }

    return generatePlainStory(componentPath, componentName)
  },
})
