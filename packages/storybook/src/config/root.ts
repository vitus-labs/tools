const INTERNAL_CONFIG = { CONFIG: {} }

export const setConfig = (value) => {
  INTERNAL_CONFIG.CONFIG = value
}

const internal = Object.freeze({
  get config() {
    return INTERNAL_CONFIG.CONFIG
  },
})

export default internal
