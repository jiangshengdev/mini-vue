export default [
  {
    space: true,
    prettier: 'compat',
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
] satisfies import('xo').FlatXoConfig
