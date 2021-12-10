import baseConfig from './baseConfig'

let config = baseConfig

export const updateConfig = (value) => {
  config = value
}

export const getConfig = () => config
