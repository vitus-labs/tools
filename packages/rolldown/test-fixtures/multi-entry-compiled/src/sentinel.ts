// Identity-bearing module-level state — the @pyreon/head createContext shape.
export const SENTINEL = Symbol('shared-sentinel')
export const REGISTRY = new Map<string, unknown>()
