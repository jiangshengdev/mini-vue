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
      '@typescript-eslint/parameter-properties': ['error', { allow: [], prefer: 'class-property' }],
      'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'arrow-body-style': ['error', 'always'],
      'func-names': ['error', 'always'],
      'func-name-matching': ['error', 'never'],
    },
  },
]

export default xoConfig
