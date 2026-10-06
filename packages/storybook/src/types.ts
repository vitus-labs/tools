export interface StoriesConfig {
  framework?: 'vite' | 'next' | 'react-native'
  outDir?: string
  port?: number
  storiesDir?: string[]
  monorepoStoriesDir?: string[]
  /**
   * Index component `index.*` files and generate virtual stories for
   * components without manual stories. Opt-in (default: false).
   */
  autoDiscovery?: boolean
  /** Globs for component index files, used when `autoDiscovery` is on */
  autoDiscoveryDir?: string[]
  monorepoAutoDiscoveryDir?: string[]
  ui?: {
    theme?: 'dark' | 'light'
  }
  globals?: Record<string, any>
  addons?: Partial<{
    controls: boolean | { expanded: boolean }
    actions: boolean
    a11y: boolean
    toolbars: boolean
    docs: boolean
    viewport: boolean | { options: Record<string, any> }
    chromatic: boolean
    designs: boolean
    mode: boolean
    pseudoStates: boolean
    themes: boolean
    vitest: boolean
    measure: boolean
    outline: boolean
    darkMode: { dark: any; light: any }
    backgrounds: {
      default: string
      options: Record<string, { name: string; value: string }>
      grid?: {
        disable?: boolean
        cellSize?: number
        opacity?: number
        cellAmount?: number
        offsetX?: number
        offsetY?: number
      }
    }
  }>
  rocketstories?: {
    module: string
    export?: string
  }
}

export interface VLToolsConfig {
  stories?: StoriesConfig
  [key: string]: any
}
