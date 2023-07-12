export default {
  presets: [
    [
      '@babel/env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/react',
    '@babel/typescript',
  ],
  env: {
    build: {
      ignore: [
        '**/*.test.tsx',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.story.tsx',
        '**/*.stories.tsx',
        '__snapshots__',
        '__tests__',
        '__stories__',
      ],
    },
  },
  ignore: ['node_modules'],
}
