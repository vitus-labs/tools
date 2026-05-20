import { REGISTRY, SENTINEL } from './sentinel.ts'
export const writeFromUse = (value: unknown) => REGISTRY.set('k', value)
export const sentinelFromUse = () => SENTINEL
