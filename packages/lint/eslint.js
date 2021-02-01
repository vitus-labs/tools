function createEslint({ projects = ['packages'], env = {}, globals = {} }) {
  return {
    root: true,
    env: {
      browser: true,
      node: true,
      es6: true,
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
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 2018,
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
      'airbnb',
      'prettier',
      'prettier/react',
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
          directory: ['./tsconfig.json'],
          project: projects.map((item) => `${item}/*/tsconfig.json'`),
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
      'react/jsx-filename-extension': [
        1,
        { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      ],
    },
  }
}

module.exports = createEslint
module.exports.default = createEslint()
