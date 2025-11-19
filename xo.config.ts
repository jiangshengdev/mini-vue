import type { FlatXoConfig } from 'xo'

const xoConfig: FlatXoConfig = [
  {
    space: true,
    prettier: 'compat',
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: true,
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
    },
  },
]

export default xoConfig
