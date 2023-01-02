import { filter, merge, omit, isEmpty } from 'lodash'
import {
  loadTsProjects,
  loadPlugins,
  loadExtendsConfigs,
  extendObject,
} from './helpers'
import type { Options } from './types'

type Config = Partial<{
  rootPath: string
  projects: string[]
  extensions: string[]
  graphqlClient: 'apollo' | 'relay' | 'lokka' | 'fraql' | 'literal'
  scope: string
  config: Record<string, any>
}>

const createEslint =
  (options?: Options) =>
  ({
    rootPath = './',
    projects = ['packages', 'apps', 'tools', 'features'],
    extensions = [],
    graphqlClient = undefined,
    scope,
    config,
  }: Config = {}) => {
    const defaultOptions: Options = {
      react: true,
      typescript: true,
      import: true,
      a11y: true,
      prettier: true,
      markdown: true,
      graphql: false,
      jest: false,
    }
    const finalOptions = merge(defaultOptions, options)
    const optionsConfig = omit(finalOptions, 'jest')

    const extensionsConfig = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.d.ts',
      ...extensions,
    ]
    const tsProjects = loadTsProjects(projects)

    const pluginsConfig = loadPlugins(optionsConfig)
    const extendsConfig = loadExtendsConfigs(optionsConfig)

    const OVERRIDES = [
      // --------------------------------------------------
      // SCRIPTS
      // --------------------------------------------------
      {
        files: ['**/bin/*.js'],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
          'no-console': 'off',
          ...extendObject(finalOptions.import, {
            'import/no-extraneous-dependencies': [
              'error',
              {
                peerDependencies: true,
              },
            ],
          }),
        },
      },

      // --------------------------------------------------
      // STORIES of STORYBOOK
      // --------------------------------------------------
      {
        files: [
          '**/__stories__/**',
          '*.stories.*',
          '*stories.*',
          '*.storyOf.*',
        ],
        rules: {
          '@typescript-eslint/explicit-module-boundary-types': 'off',
          'no-console': 'off',
          ...extendObject(finalOptions.import, {
            'import/no-extraneous-dependencies': [
              'error',
              {
                devDependencies: true,
                optionalDependencies: true,
                peerDependencies: true,
              },
            ],
          }),
        },
      },

      // --------------------------------------------------
      // MARKDOWN
      // --------------------------------------------------
      extendObject(finalOptions.markdown, {
        files: ['**/*.md', '**/*.mdx'],
        processor: 'markdown/markdown',
      }),

      // --------------------------------------------------
      // CONFIGURATION FILES
      // --------------------------------------------------
      {
        files: [
          '.eslintrc.js',
          '*.eslintrc.js',
          '*.eslintrc.*.js',
          '*.config.js',
          '.babelrc.js',
        ],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
          ...extendObject(finalOptions.import, {
            'import/no-extraneous-dependencies': [
              'error',
              {
                devDependencies: true,
                optionalDependencies: true,
                peerDependencies: true,
              },
            ],
          }),
        },
      },

      // --------------------------------------------------
      // TESTS
      // --------------------------------------------------
      extendObject(finalOptions.jest, {
        files: ['**/__tests__/**', '**/__specs__/**', '*.spec.*', '*.test.*'],
        plugins: loadPlugins(optionsConfig),
        env: {
          'jest/globals': true,
        },
        extends: loadExtendsConfigs(optionsConfig),
        settings: {
          jest: {
            version: 27,
          },
        },
        rules: {
          '@typescript-eslint/explicit-module-boundary-types': 'off',
          'no-console': 'off',
          ...extendObject(finalOptions.import, {
            'import/no-extraneous-dependencies': [
              'error',
              {
                devDependencies: true,
                optionalDependencies: true,
                peerDependencies: true,
              },
            ],
          }),
        },
      }),
    ]

    const CONFIG = {
      root: true,
      env: {
        browser: true,
        node: true,
        es2022: true,
      },
      globals: {
        __SERVER__: true,
        __WEB__: true,
        __BROWSER__: true,
        __NATIVE__: true,
        __CLIENT__: true,
      },
      parser: '@typescript-eslint/parser',
      plugins: pluginsConfig,
      parserOptions: {
        tsconfigRootDir: rootPath,
        project: ['tsconfig.json', ...tsProjects],
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      extends: extendsConfig,
      settings: {
        ...extendObject(finalOptions.import, {
          'import/extensions': extensionsConfig,
          'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
          },
          'import/resolver': {
            node: {
              extensions: extensionsConfig,
            },
            ...extendObject(finalOptions.typescript, {
              typescript: {
                alwaysTryTypes: true,
                project: [...tsProjects, 'tsconfig.json'],
              },
            }),
          },
          ...extendObject(!!scope, { 'import/internal-regex': scope }),
        }),
      },
      rules: {
        'no-unused-vars': 'off',
        'no-useless-constructor': 'off',
        'no-shadow': 'off',
        'no-use-before-define': 'off', // is being used @typescript-eslint/no-use-before-define
        'no-param-reassign': [
          'error',
          { props: true, ignorePropertyModificationsFor: ['self'] },
        ],
        ...extendObject(finalOptions.typescript, {
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/no-useless-constructor': 'error',
          '@typescript-eslint/explicit-function-return-type': 'off',
          '@typescript-eslint/no-unused-vars': 'error',
          '@typescript-eslint/member-delimiter-style': [
            2,
            {
              multiline: {
                delimiter: 'none',
                requireLast: false,
              },
              singleline: {
                delimiter: 'semi',
                requireLast: false,
              },
            },
          ],
        }),
        // --------------------------------------------------
        // IMPORT rules
        // --------------------------------------------------
        ...extendObject(finalOptions.import, {
          'import/extensions': [
            'error',
            'ignorePackages',
            {
              js: 'never',
              jsx: 'never',
              ts: 'never',
              tsx: 'never',
            },
          ],
        }),
        // --------------------------------------------------
        // REACT rules
        // --------------------------------------------------
        ...extendObject(finalOptions.react, {
          'react/require-default-props': 'off',
          'react/prop-types': 'off',
          'react/jsx-props-no-spreading': 'off',
          'react/function-component-definition': 'off',
          'react/jsx-filename-extension': [1, { extensions: extensionsConfig }],
        }),
        // --------------------------------------------------
        // GRAPHQL rules
        // --------------------------------------------------
        ...extendObject(finalOptions.graphql, {
          'graphql/template-strings': [
            'error',
            {
              // Import default settings for your GraphQL client. Supported values:
              // 'apollo', 'relay', 'lokka', 'fraql', 'literal'
              env: graphqlClient || 'literal',
              // no need to specify schema here, it will be automatically determined using .graphqlconfig
            },
          ],
        }),
        // --------------------------------------------------
        // PRETTIER rules
        // --------------------------------------------------
        ...extendObject(finalOptions.prettier, {
          'prettier/prettier': 'error',
        }),
      },
      overrides: filter(OVERRIDES, (item) => !isEmpty(item)),
    }

    return merge(CONFIG, config)
  }

export { createEslint }
export default createEslint()()
