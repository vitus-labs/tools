/**
 * Dependency ranges written into scaffolded / augmented projects.
 * Keep in sync with the ranges used by the packages in this repo.
 */
const VERSIONS = {
  /** Range for every `@vitus-labs/tools-*` package (current published major) */
  vitusLabs: '^2.0.0',
  /** Matches the `@vitus-labs/tools-typescript` peer range (rollup cannot run on TS 7) */
  typescript: '^6.0.3',
  vitest: '^4.1.11',
  vitestCoverage: '^4.1.11',
  /** Peer of `@vitus-labs/tools-vitest` */
  vite: '^8.2.2',
  biome: '^2.5.10',
  react: '^19.0.0',
  reactDom: '^19.0.0',
  typesReact: '^19.0.0',
  next: '^16.0.0',
} as const

const BIOME_SCHEMA = 'https://biomejs.dev/schemas/2.5.10/schema.json'

export { BIOME_SCHEMA, VERSIONS }
