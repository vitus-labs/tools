const createEslint = ({
  projects = ['packages', 'apps', 'tools', 'features'],
  env = {},
  globals = {},
  rules = {},
} = {}) => {
  const tsProjects = projects.map((item) => `${item}/**/*/tsconfig.json`)

  return {
    root: true,
    env: {
      browser: true,
      node: true,
      es2022: true,
      ...env,
    },
    globals: {
      __SERVER__: true,
      __WEB__: true,
      __BROWSER__: true,
      __NATIVE__: true,
      __CLIENT__: true,
      ...globals,
    },
    parser: '@typescript-eslint/parser',
    plugins: ['react', '@typescript-eslint', 'prettier'],
    parserOptions: {
      tsconfigRootDir: __dirname,
      project: ['tsconfig.json', ...tsProjects],
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    extends: [
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript',
      'plugin:react/recommended',
      'plugin:prettier/recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'airbnb',
      'prettier',
    ],
    settings: {
      'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        typescript: {
          project: ['tsconfig.json', ...tsProjects],
        },
      },
    },
    rules: {
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
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      'no-useless-constructor': 'off',
      'no-shadow': 'off',
      'no-use-before-define': 'off', // is being used @typescript-eslint/no-use-before-define
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsFor: ['self'] },
      ],
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
      'react/require-default-props': 'off',
      'react/prop-types': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/function-component-definition': 'off',
      'react/jsx-filename-extension': [
        1,
        { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      ],
      ...rules,
    },
    overrides: [
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
          'import/no-extraneous-dependencies': [
            'error',
            {
              devDependencies: true,
              optionalDependencies: true,
              peerDependencies: true,
            },
          ],
        },
      },
      {
        files: [
          '**/__stories__/**',
          '*.stories.*',
          '*stories.*',
          '**/__tests__/**',
          '**/__specs__/**',
          '*.spec.*',
          '*.test.*',
          '*.storyOf.*',
        ],
        rules: {
          '@typescript-eslint/explicit-module-boundary-types': 'off',
          'no-console': 'off',
          'import/no-extraneous-dependencies': [
            'error',
            {
              devDependencies: true,
              optionalDependencies: true,
              peerDependencies: true,
            },
          ],
        },
      },
      {
        files: ['**/bin/*.js'],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
          'no-console': 'off',
          'import/no-extraneous-dependencies': [
            'error',
            {
              peerDependencies: true,
            },
          ],
        },
      },
      {
        files: ['**/__tests__/**', '**/__specs__/**', '*.spec.*', '*.test.*'],
        plugins: ['react', '@typescript-eslint', 'jest', 'prettier'],
        env: {
          'jest/globals': true,
        },
        extends: [
          'plugin:import/errors',
          'plugin:import/warnings',
          'plugin:import/typescript',
          'plugin:react/recommended',
          'plugin:prettier/recommended',
          'plugin:@typescript-eslint/eslint-recommended',
          'plugin:@typescript-eslint/recommended',
          'airbnb',
          'plugin:jest/all',
          'prettier',
        ],
        settings: {
          jest: {
            version: 27,
          },
        },
      },
    ],
  }
}

export { createEslint }
export default createEslint()
