import { addons } from '@storybook/addons'
import { themes } from '@storybook/theming'
import CONFIG from '../config/root'

console.log('manager')
console.log(CONFIG.config)

addons.setConfig({
  theme: themes.dark,
})
