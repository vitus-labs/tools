const INTERNAL_CONFIG = { CONFIG: {} }

export const setConfig = (value: Record<string, any>) => {
  INTERNAL_CONFIG.CONFIG = value
}

const internalConfig = {
  get config() {
    return INTERNAL_CONFIG.CONFIG
  },
}

export { internalConfig, INTERNAL_CONFIG }
