import { REGISTRY, SENTINEL } from './sentinel.ts'
export const peekFromPeek = () => REGISTRY.get('k')
export const sentinelFromPeek = () => SENTINEL
