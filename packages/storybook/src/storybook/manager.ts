import { addons } from 'storybook/manager-api'
import { themes } from 'storybook/theming'

// `STORYBOOK_VL_UI_THEME` is injected by the `env` preset in ./main.ts
// (config key: `ui.theme`).
const theme =
  process.env.STORYBOOK_VL_UI_THEME === 'light' ? themes.light : themes.dark

addons.setConfig({ theme })
