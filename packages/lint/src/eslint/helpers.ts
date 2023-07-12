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
    RESULT.push('plugin:import/recommended', 'plugin:import/typescript')

  RESULT.push(
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb'
  )

  if (options.react)
    RESULT.push('plugin:react/recommended', 'plugin:react-hooks/recommended')

  if (options.a11y) RESULT.push('plugin:jsx-a11y/recommended')

  if (options.prettier) RESULT.push('plugin:prettier/recommended', 'prettier')

  if (options.jest) RESULT.push('plugin:jest/all')

  return RESULT
}

const extendObject = (
  condition: boolean | null | undefined,
  object: Record<string, any> = {}
): Record<string, any> => (condition ? object : {})

export { loadTsProjects, loadPlugins, loadExtendsConfigs, extendObject }
