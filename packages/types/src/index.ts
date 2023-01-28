import { ComponentType } from 'react'

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
export type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

/**
 * @private
 */
export type ExtractNullableKeys<T> = {
  [P in keyof T as T[P] extends null | never | undefined ? never : P]: T[P]
}

/**
 * @private
 */
export type SpreadTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>> & R
  // Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
  // Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
  // SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>

/**
 * @private
 */
export type Spread<A extends readonly [...any]> = A extends [
  infer L,
  ...infer R
]
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
