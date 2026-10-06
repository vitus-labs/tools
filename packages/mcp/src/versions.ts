/**
 * Dependency ranges written into scaffolded / augmented projects.
 * Keep in sync with the ranges used by the packages in this repo.
 */
const VERSIONS = {
  /** Range for every `@vitus-labs/tools-*` package (current published major) */
  vitusLabs: '^2.0.0',
  /** Scaffolds build with tools-rolldown / Next, both TS 7 compatible (tools-rollup needs TS 5/6) */
  typescript: '^7.0.2',
  vitest: '^5.0.3',
  vitestCoverage: '^5.0.3',
  /** Peer of `@vitus-labs/tools-vitest` */
  vite: '^8.3.3',
  biome: '^2.5.15',
  react: '^19.3.0',
  reactDom: '^19.3.0',
  typesReact: '^19.3.0',
  next: '^16.3.8',
} as const

const BIOME_SCHEMA = 'https://biomejs.dev/schemas/2.5.15/schema.json'

export { BIOME_SCHEMA, VERSIONS }
