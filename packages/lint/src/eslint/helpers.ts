import type { Options } from './types'

const loadTsProjects = (projects) =>
  projects.map((item) => `${item}/**/*/tsconfig.json`)

const loadPlugins = (options: Options) => {
  const RESULT = ['@typescript-eslint']

  if (options.import) RESULT.push('import')
  if (options.react) RESULT.push('react')
  if (options.a11y) RESULT.push('jsx-a11y')
  if (options.graphql) RESULT.push('graphql')
  if (options.markdown) RESULT.push('markdown')
  if (options.jest) RESULT.push('jest')
  if (options.prettier) RESULT.push('prettier')

  return RESULT
}

const loadExtendsConfigs = (options: Options) => {
  const RESULT: string[] = ['eslint:recommended']

  if (options.import)
    RESULT.concat(['plugin:import/recommended', 'plugin:import/typescript'])

  if (options.react)
    RESULT.concat([
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ])

  RESULT.concat([
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb',
  ])

  if (options.a11y) RESULT.concat(['plugin:jsx-a11y/recommended'])

  if (options.prettier)
    RESULT.concat(['plugin:prettier/recommended', 'prettier'])

  if (options.jest) RESULT.concat(['plugin:jest/all'])

  return RESULT
}

const extendObject = (
  condition: boolean | null | undefined,
  object: Record<string, any> = {}
): Record<string, any> => (condition ? object : {})

export { loadTsProjects, loadPlugins, loadExtendsConfigs, extendObject }
