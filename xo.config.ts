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
      'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
    },
  },
]

export default xoConfig
