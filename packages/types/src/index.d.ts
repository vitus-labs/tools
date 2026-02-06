import { ComponentType } from 'react'

// --------------------------------------------------------
// STRICT OMIT
// --------------------------------------------------------
export type StrictOmit<T, K extends keyof T> = Omit<T, K>

// --------------------------------------------------------
// EXTRACT PROPS
// --------------------------------------------------------

/**
 * Extract props
 * @public
 */
export type ExtractProps<TComponentOrTProps> =
  TComponentOrTProps extends ComponentType<infer TProps>
    ? TProps
    : TComponentOrTProps

// --------------------------------------------------------
// MERGE TYPES
// --------------------------------------------------------
/**
 * @private
 */
type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

/**
 * @private
 * Only filters out properties that are exactly never, null, or undefined
 */
type ExtractNullableKeys<T> = {
  [P in keyof T as [T[P]] extends [never]
    ? never
    : [T[P]] extends [null | undefined]
      ? never
      : P]: T[P]
}

/**
 * @private
 */
type SpreadTwo<L, R> = Id<Pick<L, Exclude<keyof L, keyof R>> & R>

/**
 * @private
 */
type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? SpreadTwo<L, Spread<R>>
  : unknown

/**
 * Merge types
 * @public
 */
export type MergeTypes<A extends readonly [...any]> = ExtractNullableKeys<
  Spread<A>
>

// to make package working
export default () => ({})
