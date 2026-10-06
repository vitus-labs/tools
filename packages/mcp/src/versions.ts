/**
 * Dependency ranges written into scaffolded / augmented projects.
 * Keep in sync with the ranges used by the packages in this repo.
 */
const VERSIONS = {
  /** Range for every `@vitus-labs/tools-*` package (current published major) */
  vitusLabs: '^2.0.0',
  /** Matches the `@vitus-labs/tools-typescript` peer range (rollup cannot run on TS 7) */
  typescript: '^6.0.3',
  vitest: '^5.0.3',
  vitestCoverage: '^5.0.3',
  /** Peer of `@vitus-labs/tools-vitest` */
  vite: '^8.3.3',
  biome: '^2.5.15',
  react: '^19.0.0',
  reactDom: '^19.0.0',
  typesReact: '^19.0.0',
  next: '^16.3.8',
} as const

const BIOME_SCHEMA = 'https://biomejs.dev/schemas/2.5.15/schema.json'

export { BIOME_SCHEMA, VERSIONS }
