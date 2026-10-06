/**
 * Regex source matching a single query parameter by name, anchored to
 * parameter boundaries so e.g. `webp` does not match `?awebp` or `?webpage=1`.
 * Matches `?name`, `&name`, `?name=value` and `?name[]=value` (also encoded).
 */
const paramSource = (pattern: string): string =>
  `[?&]${pattern}(?:[&=]|\\[|%5[bB]|$)`

/**
 * Regex matching a query parameter by name.
 */
const queryParam = (pattern: string): RegExp => new RegExp(paramSource(pattern))

/**
 * Regex source matching a query that contains all of the given parameters in
 * any order (e.g. `?url&original` and `?original&url`).
 */
const allParamsSource = (patterns: string[]): string =>
  `^${patterns.map((p) => `(?=.*${paramSource(p)})`).join('')}`

export { allParamsSource, paramSource, queryParam }
